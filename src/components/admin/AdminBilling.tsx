import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileText, IndianRupee, Download, Eye, CreditCard, Search, Printer } from "lucide-react";
import { downloadInvoicePDF, InvoicePDFData } from "@/lib/generate-invoice-pdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
interface InvoiceItem {
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  gst_rate: number;
}

// GST calculation helper
const calcGST = (taxableAmount: number, gstRate: number) => {
  const halfRate = gstRate / 2;
  return {
    cgst: +(taxableAmount * halfRate / 100).toFixed(2),
    sgst: +(taxableAmount * halfRate / 100).toFixed(2),
    igst: 0,
    total: +(taxableAmount * (1 + gstRate / 100)).toFixed(2),
    taxableAmount: +taxableAmount.toFixed(2),
  };
};

export const AdminBilling = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [showPayment, setShowPayment] = useState<any>(null);

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch HSN codes
  const { data: hsnCodes } = useQuery({
    queryKey: ["hsn-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hsn_codes")
        .select("*")
        .order("hsn_code");
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const totalRevenue = invoices?.reduce((sum, i) => sum + Number(i.total), 0) || 0;
  const totalPaid = invoices?.reduce((sum, i) => sum + Number(i.amount_paid), 0) || 0;
  const totalDue = invoices?.reduce((sum, i) => sum + Number(i.balance_due), 0) || 0;
  const invoiceCount = invoices?.length || 0;

  const filtered = invoices?.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground">MyBillBook-style GST invoicing</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: invoiceCount, icon: FileText, color: "text-primary" },
          { label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-secondary" },
          { label: "Collected", value: `₹${totalPaid.toLocaleString("en-IN")}`, icon: CreditCard, color: "text-green-600" },
          { label: "Outstanding", value: `₹${totalDue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`font-heading text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell>
                  </TableRow>
                ) : (
                  filtered?.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(inv.invoice_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right font-semibold">₹{Number(inv.total).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">₹{Number(inv.amount_paid).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.payment_status === "paid" ? "default" : inv.payment_status === "partial" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {inv.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInvoice(inv)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {inv.payment_status !== "paid" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPayment(inv)}>
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="credit-notes">
          <CreditNotesTab />
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      {showCreate && (
        <CreateInvoiceDialog
          open={showCreate}
          onClose={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }); }}
          hsnCodes={hsnCodes || []}
        />
      )}

      {/* View Invoice Dialog */}
      {viewInvoice && (
        <ViewInvoiceDialog
          invoice={viewInvoice}
          open={!!viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {/* Record Payment Dialog */}
      {showPayment && (
        <RecordPaymentDialog
          invoice={showPayment}
          open={!!showPayment}
          onClose={() => { setShowPayment(null); queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }); }}
        />
      )}
    </div>
  );
};

// --- Create Invoice Dialog ---
const CreateInvoiceDialog = ({ open, onClose, hsnCodes }: { open: boolean; onClose: () => void; hsnCodes: any[] }) => {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", gstin: "" });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0, discount: 0, gst_rate: 5 },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const addRow = () => setItems([...items, { description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0, discount: 0, gst_rate: 5 }]);
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    // Auto-fill GST from HSN
    if (field === "hsn_code") {
      const hsn = hsnCodes.find((h) => h.hsn_code === value);
      if (hsn) updated[idx].gst_rate = Number(hsn.gst_rate);
    }
    setItems(updated);
  };

  // Calculate totals
  const itemTotals = items.map((item) => {
    const lineTotal = item.quantity * item.unit_price;
    const afterDiscount = lineTotal - item.discount;
    return calcGST(afterDiscount, item.gst_rate);
  });
  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const totalDiscount = items.reduce((s, item) => s + item.discount, 0);
  const taxableTotal = itemTotals.reduce((s, t) => s + t.taxableAmount, 0);
  const cgstTotal = itemTotals.reduce((s, t) => s + t.cgst, 0);
  const sgstTotal = itemTotals.reduce((s, t) => s + t.sgst, 0);
  const grandTotal = itemTotals.reduce((s, t) => s + t.total, 0);

  const handleCreate = async () => {
    if (items.some((i) => !i.description || i.unit_price <= 0)) {
      toast.error("Fill all item details");
      return;
    }
    setLoading(true);

    try {
      // Generate invoice number
      const { data: invNum } = await supabase.rpc("generate_invoice_number");

      // Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invNum,
          customer_name: customer.name || "Walk-in",
          customer_phone: customer.phone,
          customer_address: customer.address,
          customer_gstin: customer.gstin,
          subtotal,
          discount: totalDiscount,
          taxable_amount: taxableTotal,
          cgst_total: cgstTotal,
          sgst_total: sgstTotal,
          igst_total: 0,
          total: grandTotal,
          balance_due: grandTotal,
          payment_status: "unpaid",
          notes,
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Create invoice items
      const invoiceItems = items.map((item, idx) => ({
        invoice_id: invoice.id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount: item.discount,
        taxable_amount: itemTotals[idx].taxableAmount,
        gst_rate: item.gst_rate,
        cgst: itemTotals[idx].cgst,
        sgst: itemTotals[idx].sgst,
        igst: 0,
        total: itemTotals[idx].total,
      }));

      const { error: itemsErr } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsErr) throw itemsErr;

      toast.success(`Invoice ${invNum} created!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create GST Invoice</DialogTitle>
        </DialogHeader>

        {/* Customer Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Customer Name</Label>
            <Input placeholder="Walk-in" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input placeholder="9876543210" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">GSTIN</Label>
            <Input placeholder="Optional" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Items</Label>
            <Button variant="outline" size="sm" onClick={addRow} className="rounded-lg gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add Row
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left text-xs">Description</th>
                  <th className="p-2 text-left text-xs w-24">HSN</th>
                  <th className="p-2 text-center text-xs w-16">Qty</th>
                  <th className="p-2 text-center text-xs w-16">Unit</th>
                  <th className="p-2 text-right text-xs w-20">Price</th>
                  <th className="p-2 text-right text-xs w-16">Disc</th>
                  <th className="p-2 text-center text-xs w-16">GST%</th>
                  <th className="p-2 text-right text-xs w-20">Total</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">
                      <Input value={item.description} onChange={(e) => updateRow(idx, "description", e.target.value)} className="h-8 text-xs rounded-md" placeholder="Item name" />
                    </td>
                    <td className="p-1">
                      <Select value={item.hsn_code} onValueChange={(v) => updateRow(idx, "hsn_code", v)}>
                        <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue placeholder="HSN" /></SelectTrigger>
                        <SelectContent>
                          {hsnCodes.map((h) => (
                            <SelectItem key={h.hsn_code} value={h.hsn_code} className="text-xs">
                              {h.hsn_code} - {h.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateRow(idx, "quantity", +e.target.value)} className="h-8 text-xs text-center rounded-md" />
                    </td>
                    <td className="p-1">
                      <Input value={item.unit} onChange={(e) => updateRow(idx, "unit", e.target.value)} className="h-8 text-xs text-center rounded-md" />
                    </td>
                    <td className="p-1">
                      <Input type="number" min={0} value={item.unit_price} onChange={(e) => updateRow(idx, "unit_price", +e.target.value)} className="h-8 text-xs text-right rounded-md" />
                    </td>
                    <td className="p-1">
                      <Input type="number" min={0} value={item.discount} onChange={(e) => updateRow(idx, "discount", +e.target.value)} className="h-8 text-xs text-right rounded-md" />
                    </td>
                    <td className="p-1">
                      <Select value={String(item.gst_rate)} onValueChange={(v) => updateRow(idx, "gst_rate", +v)}>
                        <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["0", "5", "12", "18", "28"].map((r) => (
                            <SelectItem key={r} value={r}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1 text-right text-xs font-semibold">
                      ₹{itemTotals[idx]?.total.toFixed(2)}
                    </td>
                    <td className="p-1">
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(idx)}>×</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-₹{totalDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>₹{taxableTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{cgstTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{sgstTotal.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold text-base"><span>Grand Total</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} className="rounded-lg text-sm" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleCreate} disabled={loading} className="rounded-xl gap-2">
            {loading ? "Creating..." : <><FileText className="h-4 w-4" /> Create Invoice</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- View Invoice Dialog ---
const ViewInvoiceDialog = ({ invoice, open, onClose }: { invoice: any; open: boolean; onClose: () => void }) => {
  const { data: items } = useQuery({
    queryKey: ["invoice-items", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["invoice-payments", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-3">
            Invoice {invoice.invoice_number}
            <Badge variant={invoice.payment_status === "paid" ? "default" : "destructive"}>
              {invoice.payment_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Invoice header */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">{invoice.customer_name || "Walk-in"}</p>
            {invoice.customer_phone && <p className="text-muted-foreground">{invoice.customer_phone}</p>}
            {invoice.customer_address && <p className="text-muted-foreground">{invoice.customer_address}</p>}
            {invoice.customer_gstin && <p className="text-muted-foreground">GSTIN: {invoice.customer_gstin}</p>}
          </div>
          <div className="text-right">
            <p>Date: {format(new Date(invoice.invoice_date), "dd MMM yyyy")}</p>
            {invoice.due_date && <p>Due: {format(new Date(invoice.due_date), "dd MMM yyyy")}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 text-left text-xs">Item</th>
                <th className="p-2 text-left text-xs">HSN</th>
                <th className="p-2 text-center text-xs">Qty</th>
                <th className="p-2 text-right text-xs">Rate</th>
                <th className="p-2 text-right text-xs">GST</th>
                <th className="p-2 text-right text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.description}</td>
                  <td className="p-2 text-muted-foreground">{item.hsn_code || "-"}</td>
                  <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                  <td className="p-2 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                  <td className="p-2 text-right text-muted-foreground">{item.gst_rate}%</td>
                  <td className="p-2 text-right font-semibold">₹{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(invoice.subtotal).toFixed(2)}</span></div>
            {Number(invoice.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-₹{Number(invoice.discount).toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{Number(invoice.cgst_total).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{Number(invoice.sgst_total).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>₹{Number(invoice.total).toFixed(2)}</span></div>
            <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{Number(invoice.amount_paid).toFixed(2)}</span></div>
            {Number(invoice.balance_due) > 0 && (
              <div className="flex justify-between text-destructive font-semibold"><span>Balance Due</span><span>₹{Number(invoice.balance_due).toFixed(2)}</span></div>
            )}
          </div>
        </div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <div>
            <h3 className="font-heading text-sm font-semibold mb-2">Payment History</h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span>{format(new Date(p.payment_date), "dd MMM yyyy")} • {p.payment_method}</span>
                  <span className="font-semibold text-green-600">₹{Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// --- Record Payment Dialog ---
const RecordPaymentDialog = ({ invoice, open, onClose }: { invoice: any; open: boolean; onClose: () => void }) => {
  const [amount, setAmount] = useState(Number(invoice.balance_due));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);

    try {
      // Record payment
      const { error: payErr } = await supabase.from("invoice_payments").insert({
        invoice_id: invoice.id,
        amount,
        payment_method: method,
        reference_number: reference || null,
      });
      if (payErr) throw payErr;

      // Update invoice
      const newPaid = Number(invoice.amount_paid) + amount;
      const newBalance = Number(invoice.total) - newPaid;
      const status = newBalance <= 0 ? "paid" : "partial";

      const { error: updErr } = await supabase
        .from("invoices")
        .update({ amount_paid: newPaid, balance_due: Math.max(0, newBalance), payment_status: status })
        .eq("id", invoice.id);
      if (updErr) throw updErr;

      toast.success("Payment recorded!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Record Payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Invoice: {invoice.invoice_number} • Due: ₹{Number(invoice.balance_due).toFixed(2)}</p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} max={Number(invoice.balance_due)} className="rounded-lg" />
          </div>
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Reference #</Label>
            <Input placeholder="Transaction ID (optional)" value={reference} onChange={(e) => setReference(e.target.value)} className="rounded-lg" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handlePay} disabled={loading} className="rounded-xl">
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Credit Notes Tab ---
const CreditNotesTab = () => {
  const { data: creditNotes, isLoading } = useQuery({
    queryKey: ["admin-credit-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("*, invoices(invoice_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="rounded-xl border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CN #</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : !creditNotes || creditNotes.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No credit notes yet</TableCell></TableRow>
          ) : (
            creditNotes.map((cn: any) => (
              <TableRow key={cn.id}>
                <TableCell className="font-mono text-sm">{cn.credit_note_number}</TableCell>
                <TableCell>{cn.invoices?.invoice_number || "-"}</TableCell>
                <TableCell>{cn.reason || "-"}</TableCell>
                <TableCell className="text-right font-semibold">₹{Number(cn.total).toFixed(2)}</TableCell>
                <TableCell><Badge variant="secondary">{cn.status}</Badge></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
