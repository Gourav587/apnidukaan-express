import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const PAYMENT_METHODS = [
  { value: "credit", label: "Credit (Khata)", desc: "Added to your ledger balance" },
  { value: "cash", label: "Cash", desc: "Pay on delivery" },
  { value: "upi", label: "UPI", desc: "Pay via UPI" },
  { value: "partial", label: "Partial Payment", desc: "Pay part now, rest on credit" },
];

const MIN_ORDER = 2000;

const WholesaleCheckout = () => {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const submittingRef = useRef(false);

  // Fetch products to check MOQ
  // Fetch products to check MOQ and stock
  const { data: products } = useQuery({
    queryKey: ["products-moq-stock"],
    queryFn: async () => {
      const ids = items.map(i => i.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("products").select("id, min_wholesale_qty, stock").in("id", ids);
      return data || [];
    },
    enabled: items.length > 0,
  });

  const sub = subtotal();
  const total = sub; // No delivery fee for wholesale

  // Check MOQ violations
  const moqViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    const minQty = product?.min_wholesale_qty || 1;
    return item.quantity < minQty;
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, minQty: product?.min_wholesale_qty || 1 };
  });

  // Check stock violations
  const stockViolations = items.filter(item => {
    const product = products?.find((p: any) => p.id === item.id);
    const stock = product?.stock ?? 0;
    return item.quantity > stock;
  }).map(item => {
    const product = products?.find((p: any) => p.id === item.id);
    return { ...item, stock: product?.stock ?? 0 };
  });

  const hasMoqViolations = moqViolations.length > 0;
  const hasStockViolations = stockViolations.length > 0;

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

  const belowMinimum = total < MIN_ORDER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (belowMinimum) {
      toast.error(`Minimum wholesale order is ₹${MIN_ORDER}`);
      return;
    }
    submittingRef.current = true;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth?redirect=/wholesale-checkout"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

      const orderPayload = {
        user_id: user.id,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total,
        status: "pending",
        customer_name: profile?.name || "Wholesale Customer",
        phone: profile?.phone || "",
        address: profile?.address || "",
        village: profile?.village || "",
        customer_type: "wholesale",
      };

      const { data: order, error } = await supabase.from("orders").insert(orderPayload).select("id").maybeSingle();
      if (error) throw error;

      // Add ledger entry for credit-based payments
      const creditAmount = paymentMethod === "credit" ? total
        : paymentMethod === "partial" ? total - Number(partialAmount || 0)
        : 0;

      if (creditAmount > 0) {
        const { error: ledgerError } = await supabase.rpc("insert_ledger_entry", {
          _user_id: user.id,
          _order_id: order?.id,
          _type: "debit",
          _amount: creditAmount,
          _description: `Order #${order?.id?.slice(0, 8)} – ${paymentMethod === "partial" ? "Partial credit" : "Full credit"}`,
        });
        if (ledgerError) throw ledgerError;
      }

      clearCart();
      toast.success("Wholesale order placed! 🎉");

      // WhatsApp notification
      const STORE_PHONE = "917888918171";
      const itemsList = items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
      const whatsappMsg = `🏪 *Wholesale Order on ApniDukaan!*\n\n👤 ${profile?.name || "Wholesaler"}\n📞 ${profile?.phone || ""}\n💳 Payment: ${paymentMethod}\n\n*Items:*\n${itemsList}\n\n💰 *Total: ₹${total}*${creditAmount > 0 ? `\n📒 Credit: ₹${creditAmount}` : ""}${notes ? `\n📝 Notes: ${notes}` : ""}`;
      window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");

      navigate("/wholesale");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/wholesale")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-lg font-bold text-primary">Wholesale Checkout</span>
        </div>
      </header>

      <div className="container py-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-5">
          <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-3">
            {/* Payment Method */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {PAYMENT_METHODS.map((pm) => (
                  <div key={pm.value} className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === pm.value ? "border-primary bg-accent" : "hover:bg-muted/50"}`}
                    onClick={() => setPaymentMethod(pm.value)}>
                    <RadioGroupItem value={pm.value} id={pm.value} className="mt-0.5" />
                    <div>
                      <Label htmlFor={pm.value} className="font-medium cursor-pointer">{pm.label}</Label>
                      <p className="text-xs text-muted-foreground">{pm.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {paymentMethod === "partial" && (
                <div className="pt-2">
                  <Label>Amount Paying Now (₹)</Label>
                  <Input
                    type="number"
                    className="rounded-xl mt-1"
                    placeholder="e.g. 1000"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    max={total}
                  />
                  {partialAmount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{Number(partialAmount)} now + ₹{total - Number(partialAmount)} on credit
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Notes */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border bg-card p-6">
              <Label>Order Notes (Optional)</Label>
              <Input
                className="rounded-xl mt-2"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </motion.div>

            {/* Stock Violations Warning */}
            {hasStockViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Insufficient stock:</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {stockViolations.map(v => (
                        <li key={v.id}>• {v.name}: {v.quantity} in cart (only {v.stock} available)</li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs rounded-lg" onClick={() => navigate("/wholesale")}>
                      Go back to adjust quantities
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* MOQ Violations Warning */}
            {hasMoqViolations && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Minimum quantity not met:</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {moqViolations.map(v => (
                        <li key={v.id}>• {v.name}: {v.quantity} in cart (min: {v.minQty})</li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs rounded-lg" onClick={() => navigate("/wholesale")}>
                      Go back to adjust quantities
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {belowMinimum && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                ⚠️ Minimum wholesale order is ₹{MIN_ORDER}. Add ₹{MIN_ORDER - total} more.
              </div>
            )}

            <Button type="submit" size="lg" className="w-full rounded-xl bg-secondary hover:bg-secondary/90" disabled={loading || belowMinimum || hasMoqViolations || hasStockViolations}>
              {loading ? "Placing Order..." : `Place Wholesale Order – ₹${total}`}
            </Button>
          </form>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="sticky top-20 rounded-xl border bg-card p-6 space-y-3">
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
                  <span>Total</span>
                  <span className="text-secondary">₹{total}</span>
                </div>
                {paymentMethod === "credit" && (
                  <p className="text-xs text-muted-foreground pt-1">💳 Full amount will be added to your khata</p>
                )}
                {paymentMethod === "partial" && partialAmount && (
                  <p className="text-xs text-muted-foreground pt-1">💳 ₹{total - Number(partialAmount)} will be added to your khata</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleCheckout;
