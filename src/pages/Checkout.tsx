import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCartStore } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Check, Trash2, Minus, Plus, ShoppingBag, Truck, Clock, CreditCard, ArrowLeft, Shield, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit phone number"),
  address: z.string().trim().min(5, "Address too short").max(500),
  village: z.string().min(1, "Select a village"),
  deliverySlot: z.string().min(1, "Select a delivery slot"),
});

const VILLAGES = ["Dinanagar", "Awankha", "Taragarh", "Kahnuwan", "Other"];
const SLOTS = [
  { value: "Morning (8AM-12PM)", label: "Morning", time: "8–12", icon: "🌅" },
  { value: "Afternoon (12PM-4PM)", label: "Afternoon", time: "12–4", icon: "☀️" },
  { value: "Evening (4PM-8PM)", label: "Evening", time: "4–8 PM", icon: "🌇" },
];

const STEPS = [
  { label: "Cart", icon: ShoppingBag },
  { label: "Details", icon: MapPin },
  { label: "Confirm", icon: Check },
];

const Checkout = () => {
  const { items, subtotal, clearCart, updateQuantity, removeItem } = useCartStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", village: "", deliverySlot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth?redirect=/checkout");
      } else {
        setUserId(user.id);
        setCheckingAuth(false);
      }
    });
  }, [navigate]);

  const { data: savedAddresses } = useQuery({
    queryKey: ["saved-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_addresses")
        .select("*")
        .eq("user_id", userId!)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: products } = useQuery({
    queryKey: ["products-stock-check", items.map(i => i.id).join(",")],
    queryFn: async () => {
      const ids = items.map(i => i.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("products").select("id, stock, name").in("id", ids);
      return data || [];
    },
    enabled: items.length > 0,
  });

  const stockViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    const stock = product?.stock ?? 0;
    return item.quantity > stock;
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, stock: product?.stock ?? 0 };
  });

  const hasStockViolations = stockViolations.length > 0;

  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = savedAddresses.find((a: any) => a.is_default) || savedAddresses[0];
      selectAddress(defaultAddr);
    }
  }, [savedAddresses]);

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setForm((f) => ({
      ...f,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      village: addr.village,
    }));
  };

  const handleDeleteAddress = async (addrId: string) => {
    setDeletingAddressId(addrId);
    try {
      const { error } = await supabase.from("saved_addresses").delete().eq("id", addrId);
      if (error) throw error;
      if (selectedAddressId === addrId) {
        setSelectedAddressId(null);
        setForm({ name: "", phone: "", address: "", village: "", deliverySlot: form.deliverySlot });
      }
      queryClient.invalidateQueries({ queryKey: ["saved-addresses", userId] });
      toast.success("Address removed");
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const sub = subtotal();
  const delivery = sub >= 500 ? 0 : 30;
  const total = sub + delivery;
  const freeDeliveryGap = 500 - sub;

  if (checkingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-3">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">Add some products to get started!</p>
        <Button onClick={() => navigate("/products")} className="rounded-xl gap-2">
          <ShoppingBag className="h-4 w-4" /> Browse Products
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (hasStockViolations) {
      toast.error("Some items exceed available stock. Please adjust quantities.");
      return;
    }
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      toast.error("Please fill all required fields");
      return;
    }
    setErrors({});
    submittingRef.current = true;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (saveAddress && user) {
        const { error: addrError } = await supabase.from("saved_addresses").insert({
          user_id: user.id, name: form.name, phone: form.phone, address: form.address,
          village: form.village, is_default: !savedAddresses || savedAddresses.length === 0,
        });
        if (addrError) console.error("Failed to save address:", addrError);
      }

      const orderPayload = {
        user_id: user?.id || null,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total, status: "pending", delivery_slot: form.deliverySlot,
        address: form.address, village: form.village, phone: form.phone,
        customer_name: form.name, customer_type: "retail",
      };

      let orderId: string = crypto.randomUUID();
      if (user) {
        const { data, error } = await supabase.from("orders").insert(orderPayload).select("id").maybeSingle();
        if (error) throw error;
        orderId = data?.id || orderId;
      } else {
        const { error } = await supabase.from("orders").insert(orderPayload);
        if (error) throw error;
      }

      clearCart();
      toast.success("Order placed successfully! 🎉");

      navigate("/order-confirmation", {
        state: {
          order: {
            id: orderId, customer_name: form.name, phone: form.phone,
            address: form.address, village: form.village, delivery_slot: form.deliverySlot,
            items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
            subtotal: sub, delivery, total,
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
    if (selectedAddressId && ["name", "phone", "address", "village"].includes(field)) {
      setSelectedAddressId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-28 lg:pb-0">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Continue Shopping</span>
            </button>
            <h1 className="font-heading text-lg md:text-xl font-bold">Checkout</h1>
            <div className="w-16 md:w-24" />
          </div>

          {/* Progress Steps - compact on mobile */}
          <div className="mt-3 flex items-center justify-center gap-0">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full transition-colors ${
                    i <= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <step.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <span className={`text-[9px] md:text-[10px] font-medium ${i <= 1 ? "text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1.5 md:mx-2 h-0.5 w-8 sm:w-12 md:w-20 rounded-full ${i < 1 ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-4 md:py-8">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-5">
          {/* Left: Form */}
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-5 lg:col-span-3" id="checkout-form">
            {/* Saved Addresses */}
            {savedAddresses && savedAddresses.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl md:rounded-2xl border bg-card p-4 md:p-5 space-y-2 md:space-y-3">
                <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Saved Addresses
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible">
                  {savedAddresses.map((addr: any) => (
                    <div
                      key={addr.id}
                      className={`relative flex-shrink-0 w-56 sm:w-auto rounded-xl border p-3 text-sm transition-all cursor-pointer group ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/30 hover:bg-muted/30"
                      }`}
                      onClick={() => selectAddress(addr)}
                    >
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

            {/* Delivery Details */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-xl md:rounded-2xl border bg-card p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Delivery Details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Full Name *</Label>
                  <Input id="name" placeholder="Your name" className={`rounded-xl mt-1 h-11 ${errors.name ? "border-destructive" : ""}`} value={form.name} onChange={(e) => update("name", e.target.value)} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">Phone Number *</Label>
                  <Input id="phone" placeholder="9876543210" inputMode="numeric" className={`rounded-xl mt-1 h-11 ${errors.phone ? "border-destructive" : ""}`} value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={10} />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="address" className="text-xs font-medium text-muted-foreground">Delivery Address *</Label>
                <Input id="address" placeholder="House no, Street, Landmark" className={`rounded-xl mt-1 h-11 ${errors.address ? "border-destructive" : ""}`} value={form.address} onChange={(e) => update("address", e.target.value)} />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Village/Area *</Label>
                <Select value={form.village} onValueChange={(v) => update("village", v)}>
                  <SelectTrigger className={`rounded-xl mt-1 h-11 ${errors.village ? "border-destructive" : ""}`}><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {VILLAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.village && <p className="text-xs text-destructive mt-1">{errors.village}</p>}
              </div>
              {!selectedAddressId && form.name && form.address && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                    <label htmlFor="save-address" className="text-sm text-muted-foreground cursor-pointer">Save this address</label>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Delivery Slot */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl md:rounded-2xl border bg-card p-4 md:p-6 space-y-3">
              <h2 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Delivery Slot
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((slot) => (
                  <button key={slot.value} type="button" onClick={() => update("deliverySlot", slot.value)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border p-2.5 md:p-3 transition-all ${
                      form.deliverySlot === slot.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/30 hover:bg-muted/30"
                    }`}>
                    <span className="text-lg md:text-xl">{slot.icon}</span>
                    <span className="text-[11px] md:text-xs font-semibold">{slot.label}</span>
                    <span className="text-[9px] md:text-[10px] text-muted-foreground">{slot.time}</span>
                  </button>
                ))}
              </div>
              {errors.deliverySlot && <p className="text-xs text-destructive">{errors.deliverySlot}</p>}
            </motion.div>

            {/* Payment */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-xl md:rounded-2xl border bg-card p-4 md:p-6">
              <h2 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Payment
              </h2>
              <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3 md:p-4">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-base md:text-lg">💵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                </div>
                <Check className="h-5 w-5 text-primary shrink-0" />
              </div>
            </motion.div>

            {/* Stock Violations */}
            {hasStockViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 md:p-4 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs md:text-sm">Insufficient stock:</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {stockViolations.map(v => (
                        <li key={v.id}>• {v.name}: {v.quantity} in cart (only {v.stock} left)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Badges - Mobile */}
            <div className="flex gap-2 lg:hidden">
              {[
                { icon: Truck, label: "30 Min" },
                { icon: Shield, label: "Secure" },
                { icon: CreditCard, label: "COD" },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card p-2.5 text-center">
                  <badge.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">{badge.label}</span>
                </div>
              ))}
            </div>
          </form>

          {/* Right: Order Summary - Desktop Only */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20 space-y-4">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card overflow-hidden">
                <div className="p-5 pb-3">
                  <h2 className="font-heading font-semibold text-lg">Order Summary</h2>
                  <p className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</p>
                </div>
                <div className="px-5 space-y-0 max-h-[340px] overflow-y-auto">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div key={item.id} layout exit={{ opacity: 0, height: 0 }} className="flex gap-3 py-3 border-t first:border-t-0">
                        <Link to={`/products/${item.id}`} className="shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover border" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xl">🛍️</div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${item.id}`} className="text-sm font-medium leading-tight line-clamp-1 hover:text-primary transition-colors">{item.name}</Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.unit}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                              <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-primary">₹{item.price * item.quantity}</span>
                              <button onClick={() => removeItem(item.id)} className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {freeDeliveryGap > 0 && (
                  <div className="mx-5 my-3 rounded-lg bg-primary/5 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Add ₹{freeDeliveryGap} more for free delivery</span>
                      <Truck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((sub / 500) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                {freeDeliveryGap <= 0 && (
                  <div className="mx-5 my-3 rounded-lg bg-secondary/10 p-3 flex items-center gap-2 text-sm text-secondary">
                    <Truck className="h-4 w-4" /> 🎉 Free delivery unlocked!
                  </div>
                )}
                <div className="p-5 pt-2 space-y-2 border-t mx-5 mt-1">
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>₹{sub}</span></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={delivery === 0 ? "text-secondary font-medium" : ""}>{delivery === 0 ? "FREE" : `₹${delivery}`}</span>
                  </div>
                  <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t"><span>Total</span><span className="text-primary">₹{total}</span></div>
                </div>
              </motion.div>

              <Button type="submit" size="lg" className="w-full rounded-xl gap-2 text-base shadow-lg shadow-primary/20" disabled={loading || hasStockViolations} onClick={handleSubmit}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Placing Order...
                  </div>
                ) : (<><Shield className="h-4 w-4" /> Place Order – ₹{total}</>)}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">🔒 Secure checkout • Your data is protected</p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Truck, label: "30 Min Delivery" },
                  { icon: Shield, label: "Secure Order" },
                  { icon: CreditCard, label: "COD Available" },
                ].map((badge) => (
                  <div key={badge.label} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2.5 text-center">
                    <badge.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-medium text-muted-foreground">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden safe-area-bottom">
        {/* Expandable summary */}
        <AnimatePresence>
          {showMobileSummary && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b">
              <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1 mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 mt-1.5 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>₹{sub}</span></div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={delivery === 0 ? "text-secondary font-medium" : "text-muted-foreground"}>{delivery === 0 ? "FREE" : `₹${delivery}`}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowMobileSummary(!showMobileSummary)} className="flex items-center gap-1 min-w-0">
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</p>
              <p className="font-heading font-bold text-lg leading-tight text-primary">₹{total}</p>
            </div>
            {showMobileSummary ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>
          <Button form="checkout-form" type="submit" size="lg" className="flex-1 rounded-xl h-12 text-sm font-semibold shadow-lg shadow-primary/20" disabled={loading || hasStockViolations}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Placing...
              </div>
            ) : (<><Shield className="h-4 w-4 mr-1" />Place Order</>)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
