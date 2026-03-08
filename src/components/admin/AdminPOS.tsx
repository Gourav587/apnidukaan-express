import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, Eye, Download, Search, IndianRupee, ShoppingBag, Pencil, CreditCard, Smartphone, Banknote, Wallet } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface BillItem {
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

type PaymentMethod = "cash" | "upi" | "card" | "online";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
  { value: "upi", label: "UPI", icon: <Smartphone className="h-4 w-4" /> },
  { value: "card", label: "Card", icon: <CreditCard className="h-4 w-4" /> },
  { value: "online", label: "Online", icon: <IndianRupee className="h-4 w-4" /> },
];

const paymentBadgeVariant = (method: string) => {
  switch (method) {
    case "upi": return "default";
    case "card": return "secondary";
    case "online": return "outline";
    default: return "secondary";
  }
};

// ─── Invoice HTML Generator ────────────────────────────────────
function generateInvoiceHTML(order: any) {
  const items = (order.items as BillItem[]) || [];
  const date = format(new Date(order.created_at), "dd MMM yyyy, hh:mm a");
  const invoiceId = order.id.slice(0, 8).toUpperCase();
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Invoice #${invoiceId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #16213e; padding-bottom: 20px; }
  .store-name { font-size: 28px; font-weight: 800; color: #16213e; }
  .store-sub { font-size: 12px; color: #666; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-label { font-size: 24px; font-weight: 700; color: #0f3460; }
  .invoice-id { font-size: 14px; color: #666; margin-top: 4px; }
  .invoice-date { font-size: 13px; color: #888; margin-top: 2px; }
  .customer-box { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .customer-box h3 { font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 8px; }
  .customer-box p { font-size: 14px; margin: 2px 0; }
  .payment-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #16213e; color: white; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-box { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals-row.discount { color: #d32f2f; }
  .totals-row.tax { color: #666; }
  .totals-row.grand { border-top: 2px solid #16213e; padding-top: 10px; margin-top: 6px; font-size: 18px; font-weight: 700; color: #16213e; }
  .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
  <div class="header">
    <div>
      <div class="store-name">ApniDukaan</div>
      <div class="store-sub">Your Neighbourhood Grocery Store</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-id">#${invoiceId}</div>
      <div class="invoice-date">${date}</div>
      <div style="margin-top:6px"><span class="payment-badge">${(order.payment_method || "cash").toUpperCase()}</span></div>
    </div>
  </div>
  ${order.customer_name ? `
  <div class="customer-box">
    <h3>Bill To</h3>
    <p><strong>${order.customer_name}</strong></p>
    ${order.phone ? `<p>📞 ${order.phone}</p>` : ""}
    ${order.address ? `<p>📍 ${order.address}${order.village ? `, ${order.village}` : ""}</p>` : ""}
  </div>` : ""}
  <table>
    <thead><tr><th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
    <tbody>
      ${items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${item.unit || "-"}</td>
          <td>${item.quantity}</td>
          <td>₹${item.price}</td>
          <td>₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="totals-row discount"><span>Discount</span><span>-₹${discount.toFixed(2)}</span></div>` : ""}
      ${tax > 0 ? `<div class="totals-row tax"><span>Tax</span><span>+₹${tax.toFixed(2)}</span></div>` : ""}
      <div class="totals-row grand"><span>Total</span><span>₹${order.total}</span></div>
    </div>
  </div>
  <div class="footer">
    <p>Thank you for shopping with ApniDukaan!</p>
    <p>This is a computer-generated invoice.</p>
  </div>
</body></html>`;
}

function downloadInvoice(order: any) {
  const html = generateInvoiceHTML(order);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }
}

// ─── Items Detail Dialog ───────────────────────────────────────
function ItemsDetailDialog({ order }: { order: any }) {
  const items = (order.items as BillItem[]) || [];
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="View Items">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Invoice #{order.id.slice(0, 8).toUpperCase()}</DialogTitle>
          <p className="text-sm text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}</p>
        </DialogHeader>
        {order.customer_name && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
            <p className="font-medium">{order.customer_name}</p>
            {order.phone && <p className="text-muted-foreground">📞 {order.phone}</p>}
          </div>
        )}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">₹{item.price}</TableCell>
                  <TableCell className="text-right font-semibold">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-1 text-sm pt-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
          {tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>+₹{tax.toFixed(2)}</span></div>}
          <div className="flex justify-between items-center pt-2 border-t font-heading font-bold text-lg">
            <span>Total</span><span>₹{order.total}</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-1">
          <Badge variant={paymentBadgeVariant(order.payment_method)} className="rounded-full capitalize gap-1">
            {PAYMENT_METHODS.find(m => m.value === order.payment_method)?.icon}
            {order.payment_method || "cash"}
          </Badge>
          <Button onClick={() => downloadInvoice(order)} className="gap-2 rounded-xl">
            <Download className="h-4 w-4" /> Download Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Bill Dialog ─────────────────────────────────
function BillDialog({
  products,
  onSaved,
  editOrder,
  trigger,
}: {
  products: any[];
  onSaved: () => void;
  editOrder?: any;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState(editOrder?.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(editOrder?.phone || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editOrder?.payment_method || "cash");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [billItems, setBillItems] = useState<BillItem[]>(
    editOrder ? (editOrder.items as BillItem[]) || [] : []
  );
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setBillItems(editOrder ? (editOrder.items as BillItem[]) || [] : []);
    setCustomerName(editOrder?.customer_name || "");
    setCustomerPhone(editOrder?.phone || "");
    setPaymentMethod(editOrder?.payment_method || "cash");
    setDiscountPercent(0);
    setTaxPercent(0);
    setSelectedProduct("");
    setQuantity(1);
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const existing = billItems.findIndex((i) => i.name === product.name);
    if (existing >= 0) {
      const updated = [...billItems];
      updated[existing].quantity += quantity;
      setBillItems(updated);
    } else {
      setBillItems([...billItems, { name: product.name, price: product.price, quantity, unit: product.unit }]);
    }
    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItem = (index: number) => setBillItems(billItems.filter((_, i) => i !== index));

  const subtotal = billItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmt = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = (afterDiscount * taxPercent) / 100;
  const total = afterDiscount + taxAmt;

  const handleSubmit = async () => {
    if (billItems.length === 0) { toast.error("Add at least one item"); return; }
    setLoading(true);
    try {
      const payload = {
        items: billItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total: Math.round(total * 100) / 100,
        status: "delivered",
        customer_type: "retail",
        customer_name: customerName || "Walk-in Customer",
        phone: customerPhone || null,
        payment_method: paymentMethod,
        discount: Math.round(discountAmt * 100) / 100,
        tax: Math.round(taxAmt * 100) / 100,
      };

      if (editOrder) {
        const { error } = await supabase.from("orders").update(payload).eq("id", editOrder.id);
        if (error) throw error;
        toast.success("Bill updated successfully!");
      } else {
        const { error } = await supabase.from("orders").insert(payload);
        if (error) throw error;
        toast.success("Bill created successfully!");
      }
      onSaved();
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editOrder ? "Edit POS Bill" : "Create POS Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer Name</Label>
              <Input placeholder="Walk-in Customer" className="rounded-xl mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input placeholder="9876543210" className="rounded-xl mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs font-semibold">Payment Method</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {PAYMENT_METHODS.map((m) => (
                <Button
                  key={m.value}
                  type="button"
                  variant={paymentMethod === m.value ? "default" : "outline"}
                  className="gap-1.5 rounded-xl text-xs h-9"
                  onClick={() => setPaymentMethod(m.value)}
                >
                  {m.icon} {m.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Add Product */}
          <div className="rounded-xl border p-3 space-y-3">
            <Label className="text-xs font-semibold">Add Product</Label>
            <div className="flex gap-2">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="flex-1 rounded-xl"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-20 rounded-xl" />
              <Button type="button" onClick={addItem} disabled={!selectedProduct} className="rounded-xl">Add</Button>
            </div>
          </div>

          {/* Items List */}
          {billItems.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.price}</TableCell>
                      <TableCell className="text-right font-semibold">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Discount & Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discount (%)</Label>
              <Input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tax (%)</Label>
              <Input type="number" min={0} max={100} value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="rounded-xl mt-1" />
            </div>
          </div>

          {/* Totals & Submit */}
          <div className="space-y-1 text-sm border-t pt-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-destructive"><span>Discount ({discountPercent}%)</span><span>-₹{discountAmt.toFixed(2)}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({taxPercent}%)</span><span>+₹{taxAmt.toFixed(2)}</span></div>}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-heading font-bold text-lg">Total: ₹{total.toFixed(2)}</span>
              <Button onClick={handleSubmit} disabled={loading || billItems.length === 0} className="gap-2 rounded-xl">
                {loading ? "Saving..." : editOrder ? "Update Bill" : "Generate Bill"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Daily Sales Summary ───────────────────────────────────────
function DailySummary({ orders }: { orders: any[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
  const totalSales = todayOrders.reduce((s, o) => s + Number(o.total), 0);

  const byPayment = todayOrders.reduce((acc, o) => {
    const m = o.payment_method || "cash";
    acc[m] = (acc[m] || 0) + Number(o.total);
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: "Today's Bills", value: todayOrders.length, icon: <Receipt className="h-5 w-5 text-primary" /> },
    { label: "Today's Sales", value: `₹${totalSales.toFixed(0)}`, icon: <IndianRupee className="h-5 w-5 text-primary" /> },
    { label: "Items Sold", value: todayOrders.reduce((s, o) => s + ((o.items as any[]) || []).reduce((a: number, i: any) => a + (i.quantity || 0), 0), 0), icon: <ShoppingBag className="h-5 w-5 text-primary" /> },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">{s.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-heading font-bold text-xl">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {Object.keys(byPayment).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byPayment).map(([method, amount]) => (
            <Badge key={method} variant="outline" className="rounded-full gap-1 capitalize text-xs px-3 py-1">
              {PAYMENT_METHODS.find(m => m.value === method)?.icon}
              {method}: ₹{(amount as number).toFixed(0)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main POS Component ────────────────────────────────────────
export function AdminPOS() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill permanently?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    toast.success("Bill deleted");
    invalidate();
  };

  const posOrders = (orders || []).filter((o: any) => !o.user_id).filter((o: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.id.includes(q) || o.customer_name?.toLowerCase().includes(q) || o.phone?.includes(q);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">POS Billing</h1>
          <p className="text-sm text-muted-foreground">{posOrders.length} bills</p>
        </div>
        <BillDialog
          products={products || []}
          onSaved={invalidate}
          trigger={<Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> New Bill</Button>}
        />
      </div>

      {/* Daily Summary */}
      <DailySummary orders={posOrders} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by ID, name, phone..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {posOrders.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-heading font-semibold">No POS records yet</p>
          <p className="text-sm text-muted-foreground">Click "New Bill" to create your first in-store bill</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posOrders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{o.customer_name || "Walk-in"}</p>
                    {o.phone && <p className="text-xs text-muted-foreground">{o.phone}</p>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {(o.items as any[])?.map((i: any) => `${i.name} × ${i.quantity}`).join(", ")}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">₹{o.total}</span>
                    {(Number(o.discount) > 0 || Number(o.tax) > 0) && (
                      <div className="flex gap-1 mt-0.5">
                        {Number(o.discount) > 0 && <span className="text-[10px] text-destructive">-₹{o.discount}</span>}
                        {Number(o.tax) > 0 && <span className="text-[10px] text-muted-foreground">+₹{o.tax} tax</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentBadgeVariant(o.payment_method)} className="rounded-full text-xs capitalize gap-1">
                      {PAYMENT_METHODS.find(m => m.value === o.payment_method)?.icon}
                      {o.payment_method || "cash"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(o.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ItemsDetailDialog order={o} />
                      <BillDialog
                        products={products || []}
                        onSaved={invalidate}
                        editOrder={o}
                        trigger={
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit Bill">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Download Invoice" onClick={() => downloadInvoice(o)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete Bill" onClick={() => handleDelete(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
