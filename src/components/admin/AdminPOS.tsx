import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, Eye, Download, Search } from "lucide-react";
import { format } from "date-fns";

interface BillItem {
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

function generateInvoiceHTML(order: any) {
  const items = (order.items as BillItem[]) || [];
  const date = format(new Date(order.created_at), "dd MMM yyyy, hh:mm a");
  const invoiceId = order.id.slice(0, 8).toUpperCase();

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
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #16213e; color: white; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-box { width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
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
      <div class="totals-row"><span>Subtotal</span><span>₹${order.total}</span></div>
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

function ItemsDetailDialog({ order }: { order: any }) {
  const items = (order.items as BillItem[]) || [];
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
        <div className="flex justify-between items-center pt-2">
          <span className="font-heading font-bold text-lg">Total: ₹{order.total}</span>
          <Button onClick={() => downloadInvoice(order)} className="gap-2 rounded-xl">
            <Download className="h-4 w-4" /> Download Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateBillDialog({ products, onCreated }: { products: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

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
  const total = billItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (billItems.length === 0) { toast.error("Add at least one item"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("orders").insert({
        items: billItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit })),
        total,
        status: "delivered",
        customer_type: "retail",
        customer_name: customerName || "Walk-in Customer",
        phone: customerPhone || null,
      });
      if (error) throw error;
      toast.success("Bill created successfully!");
      onCreated();
      setBillItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> New Bill</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create POS Bill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer Name (optional)</Label>
              <Input placeholder="Walk-in Customer" className="rounded-xl mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone (optional)</Label>
              <Input placeholder="9876543210" className="rounded-xl mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
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

          {/* Total & Submit */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-heading font-bold text-lg">Total: ₹{total.toFixed(2)}</span>
            <Button onClick={handleSubmit} disabled={loading || billItems.length === 0} className="gap-2 rounded-xl">
              {loading ? "Creating..." : "Generate Bill"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

  // POS orders: no user_id (walk-in) or status delivered immediately
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
        <CreateBillDialog products={products || []} onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-orders"] })} />
      </div>

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
                  <TableCell className="font-semibold">₹{o.total}</TableCell>
                  <TableCell><Badge variant="secondary" className="rounded-full text-xs">Cash</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(o.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ItemsDetailDialog order={o} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Download Invoice" onClick={() => downloadInvoice(o)}>
                        <Download className="h-3.5 w-3.5" />
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
