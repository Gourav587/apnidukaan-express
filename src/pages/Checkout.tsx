import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit phone number"),
  address: z.string().min(5, "Address too short").max(500),
  village: z.string().min(1, "Select a village"),
  deliverySlot: z.string().min(1, "Select a delivery slot"),
});

const VILLAGES = ["Dinanagar", "Awankha", "Taragarh", "Kahnuwan", "Other"];
const SLOTS = ["Morning (8AM-12PM)", "Afternoon (12PM-4PM)", "Evening (4PM-8PM)"];

const Checkout = () => {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", village: "", deliverySlot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

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

  // Fetch saved addresses
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

  // Auto-fill default address on first load
  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = savedAddresses.find((a: any) => a.is_default) || savedAddresses[0];
      selectAddress(defaultAddr);
    }
  }, [savedAddresses]);

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setForm({
      ...form,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      village: addr.village,
    });
  };

  const sub = subtotal();
  const delivery = sub >= 500 ? 0 : 30;
  const total = sub + delivery;

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
        <h1 className="font-heading text-2xl font-bold mb-3">Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">Add some products first!</p>
        <Button onClick={() => navigate("/products")} className="rounded-xl">Browse Products</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save address if checkbox is checked
      if (saveAddress && user) {
        const { error: addrError } = await supabase.from("saved_addresses").insert({
          user_id: user.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          village: form.village,
          is_default: !savedAddresses || savedAddresses.length === 0,
        });
        if (addrError) console.error("Failed to save address:", addrError);
      }

      const orderPayload = {
        user_id: user?.id || null,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total,
        status: "pending",
        delivery_slot: form.deliverySlot,
        address: form.address,
        village: form.village,
        phone: form.phone,
        customer_name: form.name,
        customer_type: "retail",
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

      const STORE_PHONE = "917888918171";
      const itemsList = items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
      const whatsappMsg = `🛒 *New Order on ApniDukaan!*\n\n👤 ${form.name}\n📞 ${form.phone}\n📍 ${form.address}, ${form.village}\n🕐 ${form.deliverySlot}\n\n*Items:*\n${itemsList}\n\n💰 *Total: ₹${total}*${delivery === 0 ? " (Free Delivery)" : ` + ₹${delivery} delivery`}`;
      const whatsappUrl = `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(whatsappMsg)}`;
      window.open(whatsappUrl, "_blank");
      navigate("/order-confirmation", {
        state: {
          order: {
            id: orderId,
            customer_name: form.name,
            phone: form.phone,
            address: form.address,
            village: form.village,
            delivery_slot: form.deliverySlot,
            items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
            subtotal: sub,
            delivery,
            total,
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    // If user manually edits, deselect saved address
    if (selectedAddressId && ["name", "phone", "address", "village"].includes(field)) {
      setSelectedAddressId(null);
    }
  };

  return (
    <div className="container py-6 md:py-10">
      <h1 className="font-heading text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-3">
          {/* Saved Addresses */}
          {savedAddresses && savedAddresses.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Saved Addresses
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {savedAddresses.map((addr: any) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => selectAddress(addr)}
                    className={`rounded-xl border p-3 text-left text-sm transition-all ${
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs bg-muted px-2 py-0.5 rounded-full">{addr.label}</span>
                      {selectedAddressId === addr.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="font-medium">{addr.name}</p>
                    <p className="text-xs text-muted-foreground">{addr.address}, {addr.village}</p>
                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-heading font-semibold text-lg">Delivery Details</h2>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your name" className="rounded-xl mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="phone">WhatsApp Number</Label>
              <Input id="phone" placeholder="9876543210" className="rounded-xl mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="address">Delivery Address</Label>
              <Input id="address" placeholder="House no, Street, Landmark" className="rounded-xl mt-1" value={form.address} onChange={(e) => update("address", e.target.value)} />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
            </div>
            <div>
              <Label>Village/Area</Label>
              <Select value={form.village} onValueChange={(v) => update("village", v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>
                  {VILLAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.village && <p className="text-xs text-destructive mt-1">{errors.village}</p>}
            </div>
            <div>
              <Label>Delivery Slot</Label>
              <Select value={form.deliverySlot} onValueChange={(v) => update("deliverySlot", v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select time slot" /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.deliverySlot && <p className="text-xs text-destructive mt-1">{errors.deliverySlot}</p>}
            </div>

            {/* Save address checkbox */}
            {!selectedAddressId && form.name && form.address && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-address"
                  checked={saveAddress}
                  onCheckedChange={(v) => setSaveAddress(!!v)}
                />
                <label htmlFor="save-address" className="text-sm text-muted-foreground cursor-pointer">
                  Save this address for future orders
                </label>
              </div>
            )}

            <div className="rounded-lg bg-secondary/10 p-3 text-sm text-secondary">
              💵 Payment: Cash on Delivery only
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={loading}>
            {loading ? "Placing Order..." : `Place Order – ₹${total}`}
          </Button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 rounded-xl border bg-card p-6 space-y-3">
            <h2 className="font-heading font-semibold text-lg">Order Summary</h2>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{sub}</span></div>
              <div className="flex justify-between text-sm"><span>Delivery</span><span>{delivery === 0 ? "FREE" : `₹${delivery}`}</span></div>
              <div className="flex justify-between font-heading font-semibold text-lg pt-2 border-t"><span>Total</span><span className="text-primary">₹{total}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
