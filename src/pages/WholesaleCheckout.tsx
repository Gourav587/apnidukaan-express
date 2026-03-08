import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, AlertTriangle, ChevronUp, ChevronDown, MapPin, Check, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";

const PAYMENT_METHODS = [
  { value: "credit", label: "Credit (Khata)", desc: "Added to your ledger" },
  { value: "cash", label: "Cash", desc: "Pay on delivery" },
  { value: "upi", label: "UPI", desc: "Pay via UPI" },
  { value: "partial", label: "Partial", desc: "Part now, rest on credit" },
];

const MIN_ORDER = 2000;

const WholesaleCheckout = () => {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: "", phone: "", address: "", village: "" });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const submittingRef = useRef(false);

  const VILLAGES = ["Dinanagar", "Awankha", "Taragarh", "Kahnuwan", "Other"];

  // Load user and prefill from profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (profile) {
        setAddressForm({
          name: profile.name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          village: profile.village || "",
        });
      }
    };
    loadProfile();
  }, []);

  // Fetch saved addresses
  const { data: savedAddresses } = useQuery({
    queryKey: ["saved-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_addresses").select("*").eq("user_id", userId!).order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Auto-select default address
  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = savedAddresses.find((a: any) => a.is_default) || savedAddresses[0];
      selectAddress(defaultAddr);
    }
  }, [savedAddresses]);

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setAddressForm({ name: addr.name, phone: addr.phone, address: addr.address, village: addr.village });
    setAddressErrors({});
  };

  const handleDeleteAddress = async (addrId: string) => {
    setDeletingAddressId(addrId);
    try {
      const { error } = await supabase.from("saved_addresses").delete().eq("id", addrId);
      if (error) throw error;
      if (selectedAddressId === addrId) {
        setSelectedAddressId(null);
        setAddressForm({ name: "", phone: "", address: "", village: "" });
      }
      queryClient.invalidateQueries({ queryKey: ["saved-addresses", userId] });
      toast.success("Address removed");
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const { data: products } = useQuery({
    queryKey: ["products-moq-stock"],
    queryFn: async () => {
      const ids = items.map(i => i.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("products").select("id, min_wholesale_qty, max_wholesale_qty, stock").in("id", ids);
      return data || [];
    },
    enabled: items.length > 0,
  });

  const sub = subtotal();
  const total = sub;

  const moqViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return item.quantity < (product?.min_wholesale_qty || 1);
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, minQty: product?.min_wholesale_qty || 1 };
  });

  const maxQtyViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return product?.max_wholesale_qty && item.quantity > product.max_wholesale_qty;
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, maxQty: product?.max_wholesale_qty };
  });

  const stockViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return item.quantity > (product?.stock ?? 0);
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, stock: product?.stock ?? 0 };
  });

  const hasMoqViolations = moqViolations.length > 0;
  const hasMaxQtyViolations = maxQtyViolations.length > 0;
  const hasStockViolations = stockViolations.length > 0;
  const hasAnyIssue = hasMoqViolations || hasMaxQtyViolations || hasStockViolations;
  const belowMinimum = total < MIN_ORDER;

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-3">Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">Add wholesale products first!</p>
        <Button onClick={() => navigate("/wholesale")} className="rounded-xl">Back to Wholesale</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    // Validate address
    const errs: Record<string, string> = {};
    if (!addressForm.name.trim() || addressForm.name.trim().length < 2) errs.name = "Name is required";
    if (!addressForm.phone.match(/^[6-9]\d{9}$/)) errs.phone = "Valid 10-digit number required";
    if (!addressForm.address.trim() || addressForm.address.trim().length < 5) errs.address = "Address is required";
    if (!addressForm.village) errs.village = "Select a village";
    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      toast.error("Please fill delivery details");
      return;
    }
    setAddressErrors({});

    if (belowMinimum) { toast.error(`Minimum wholesale order is ₹${MIN_ORDER}`); return; }
    if (paymentMethod === "partial") {
      const amt = Number(partialAmount);
      if (isNaN(amt) || amt < 0 || amt > total) {
        toast.error("Enter a valid partial payment amount between ₹0 and ₹" + total);
        return;
      }
    }
    submittingRef.current = true;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth?redirect=/wholesale-checkout"); return; }

      // Save address if requested
      if (saveAddress && !selectedAddressId) {
        await supabase.from("saved_addresses").insert({
          user_id: user.id, name: addressForm.name, phone: addressForm.phone,
          address: addressForm.address, village: addressForm.village,
          is_default: !savedAddresses || savedAddresses.length === 0,
        });
      }

      const orderPayload = {
        user_id: user.id,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total, status: "pending",
        customer_name: addressForm.name,
        phone: addressForm.phone, address: addressForm.address,
        village: addressForm.village, customer_type: "wholesale",
        payment_method: paymentMethod,
      };

      const { data: order, error } = await supabase.from("orders").insert(orderPayload).select("id").maybeSingle();
      if (error) throw error;

      const creditAmount = paymentMethod === "credit" ? total
        : paymentMethod === "partial" ? total - Number(partialAmount || 0) : 0;

      if (creditAmount > 0) {
        const { error: ledgerError } = await supabase.rpc("insert_ledger_entry", {
          _user_id: user.id, _order_id: order?.id, _type: "debit", _amount: creditAmount,
          _description: `Order #${order?.id?.slice(0, 8)} – ${paymentMethod === "partial" ? "Partial credit" : "Full credit"}`,
        });
        if (ledgerError) throw ledgerError;
      }

      clearCart();
      toast.success("Wholesale order placed! 🎉");

      const STORE_PHONE = "917888918171";
      const itemsList = items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
      const whatsappMsg = `🏪 *Wholesale Order on ApniDukaan!*\n\n👤 ${addressForm.name}\n📞 ${addressForm.phone}\n📍 ${addressForm.address}, ${addressForm.village}\n💳 Payment: ${paymentMethod}\n\n*Items:*\n${itemsList}\n\n💰 *Total: ₹${total}*${creditAmount > 0 ? `\n📒 Credit: ₹${creditAmount}` : ""}${notes ? `\n📝 Notes: ${notes}` : ""}`;
      window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
      navigate("/wholesale");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-12 md:h-14 items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/wholesale")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-base md:text-lg font-bold text-primary">Wholesale Checkout</span>
        </div>
      </header>

      <div className="container py-4 md:py-10">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-5">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 lg:col-span-3" id="wholesale-checkout-form">
            {/* Saved Addresses */}
            {savedAddresses && savedAddresses.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-4 md:p-5 space-y-2 md:space-y-3">
                <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Saved Addresses
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible">
                  {savedAddresses.map((addr: any) => (
                    <div key={addr.id}
                      className={`relative flex-shrink-0 w-56 sm:w-auto rounded-xl border p-3 text-sm transition-all cursor-pointer group ${
                        selectedAddressId === addr.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/30 hover:bg-muted/30"
                      }`}
                      onClick={() => selectAddress(addr)}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }}
                        disabled={deletingAddressId === addr.id}
                        className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[10px] uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">{addr.label}</span>
                        {addr.is_default && <span className="text-[10px] text-primary font-medium">Default</span>}
                      </div>
                      <p className="font-medium truncate">{addr.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{addr.address}, {addr.village}</p>
                      <p className="text-xs text-muted-foreground">{addr.phone}</p>
                      {selectedAddressId === addr.id && (
                        <div className="absolute right-2 bottom-2"><Check className="h-4 w-4 text-primary" /></div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Delivery Address */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-card p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Delivery Details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Full Name *</Label>
                  <Input placeholder="Your name" className={`rounded-xl mt-1 h-11 ${addressErrors.name ? "border-destructive" : ""}`}
                    value={addressForm.name} onChange={(e) => { setAddressForm(f => ({ ...f, name: e.target.value })); setAddressErrors(e2 => ({ ...e2, name: "" })); if (selectedAddressId) setSelectedAddressId(null); }} />
                  {addressErrors.name && <p className="text-xs text-destructive mt-1">{addressErrors.name}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Phone Number *</Label>
                  <Input placeholder="9876543210" inputMode="numeric" maxLength={10}
                    className={`rounded-xl mt-1 h-11 ${addressErrors.phone ? "border-destructive" : ""}`}
                    value={addressForm.phone} onChange={(e) => { setAddressForm(f => ({ ...f, phone: e.target.value })); setAddressErrors(e2 => ({ ...e2, phone: "" })); if (selectedAddressId) setSelectedAddressId(null); }} />
                  {addressErrors.phone && <p className="text-xs text-destructive mt-1">{addressErrors.phone}</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Delivery Address *</Label>
                <Input placeholder="Shop address, Street, Landmark" className={`rounded-xl mt-1 h-11 ${addressErrors.address ? "border-destructive" : ""}`}
                  value={addressForm.address} onChange={(e) => { setAddressForm(f => ({ ...f, address: e.target.value })); setAddressErrors(e2 => ({ ...e2, address: "" })); if (selectedAddressId) setSelectedAddressId(null); }} />
                {addressErrors.address && <p className="text-xs text-destructive mt-1">{addressErrors.address}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Village/Area *</Label>
                <Select value={addressForm.village} onValueChange={(v) => { setAddressForm(f => ({ ...f, village: v })); setAddressErrors(e2 => ({ ...e2, village: "" })); if (selectedAddressId) setSelectedAddressId(null); }}>
                  <SelectTrigger className={`rounded-xl mt-1 h-11 ${addressErrors.village ? "border-destructive" : ""}`}><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {VILLAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {addressErrors.village && <p className="text-xs text-destructive mt-1">{addressErrors.village}</p>}
              </div>
              {!selectedAddressId && addressForm.name && addressForm.address && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox id="save-ws-address" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                    <label htmlFor="save-ws-address" className="text-sm text-muted-foreground cursor-pointer">Save this address</label>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Payment Method */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-card p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="font-heading font-semibold text-base md:text-lg">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2 md:grid-cols-1 md:space-y-0">
                {PAYMENT_METHODS.map((pm) => (
                  <label key={pm.value} htmlFor={`pay-${pm.value}`}
                    className={`flex items-start space-x-2 md:space-x-3 rounded-xl border p-3 md:p-4 cursor-pointer transition-colors ${
                      paymentMethod === pm.value ? "border-primary bg-accent" : "hover:bg-muted/50"
                    }`}>
                    <RadioGroupItem value={pm.value} id={`pay-${pm.value}`} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium text-xs md:text-sm">{pm.label}</span>
                      <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{pm.desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {paymentMethod === "partial" && (
                <div className="pt-2">
                  <Label className="text-xs">Amount Paying Now (₹)</Label>
                  <Input type="number" inputMode="numeric" className="rounded-xl mt-1 h-11" placeholder="e.g. 1000"
                    value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} max={total} />
                  {partialAmount && (
                    <p className="text-xs text-muted-foreground mt-1">₹{Number(partialAmount)} now + ₹{total - Number(partialAmount)} on credit</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Notes */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border bg-card p-4 md:p-6">
              <Label className="text-xs">Order Notes (Optional)</Label>
              <Input className="rounded-xl mt-2 h-11" placeholder="Any special instructions..."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </motion.div>

            {/* Warnings */}
            {hasStockViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Insufficient stock:</p>
                    <ul className="mt-1 space-y-0.5 text-[11px]">
                      {stockViolations.map(v => (
                        <li key={v.id}>• {v.name}: {v.quantity} in cart ({v.stock} available)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {hasMoqViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Minimum quantity not met:</p>
                    <ul className="mt-1 space-y-0.5 text-[11px]">
                      {moqViolations.map(v => (
                        <li key={v.id}>• {v.name}: {v.quantity} in cart (min: {v.minQty})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {hasMaxQtyViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Max quantity exceeded:</p>
                    <ul className="mt-1 space-y-0.5 text-[11px]">
                      {maxQtyViolations.map((v: any) => (
                        <li key={v.id}>• {v.name}: max {v.maxQty} (you have {v.quantity})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {belowMinimum && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                ⚠️ Minimum order ₹{MIN_ORDER}. Add ₹{MIN_ORDER - total} more.
              </div>
            )}

            {/* Desktop submit */}
            <div className="hidden lg:block">
              <Button type="submit" size="lg" className="w-full rounded-xl bg-secondary hover:bg-secondary/90"
                disabled={loading || belowMinimum || hasAnyIssue}>
                {loading ? "Placing Order..." : `Place Wholesale Order – ₹${total}`}
              </Button>
            </div>
          </form>

          {/* Order Summary - Desktop */}
          <div className="hidden lg:block lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="sticky top-20 rounded-xl border bg-card p-6 space-y-3">
              <h2 className="font-heading font-semibold text-lg">Order Summary</h2>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                    <span className="font-medium">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{sub}</span></div>
                <div className="flex justify-between text-sm text-secondary"><span>Delivery</span><span>FREE</span></div>
                <div className="flex justify-between font-heading font-semibold text-lg pt-2 border-t">
                  <span>Total</span><span className="text-secondary">₹{total}</span>
                </div>
                {paymentMethod === "credit" && (
                  <p className="text-xs text-muted-foreground pt-1">💳 Full amount added to khata</p>
                )}
                {paymentMethod === "partial" && partialAmount && (
                  <p className="text-xs text-muted-foreground pt-1">💳 ₹{total - Number(partialAmount)} added to khata</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden safe-area-bottom">
        <AnimatePresence>
          {showMobileSummary && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b">
              <div className="max-h-44 overflow-y-auto px-4 py-3 space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1 mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 mt-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Delivery</span><span className="text-secondary font-medium">FREE</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowMobileSummary(!showMobileSummary)} className="flex items-center gap-1 min-w-0">
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</p>
              <p className="font-heading font-bold text-lg leading-tight text-secondary">₹{total}</p>
            </div>
            {showMobileSummary ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>
          <Button form="wholesale-checkout-form" type="submit" size="lg"
            className="flex-1 rounded-xl h-12 text-sm font-semibold bg-secondary hover:bg-secondary/90"
            disabled={loading || belowMinimum || hasAnyIssue}>
            {loading ? "Placing..." : "Place Order"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WholesaleCheckout;
