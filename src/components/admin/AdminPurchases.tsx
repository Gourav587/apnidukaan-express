import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, FileText, IndianRupee, Receipt } from "lucide-react";

const calcGST = (taxableAmount: number, gstRate: number) => {
  const half = gstRate / 2;
  return {
    cgst: +(taxableAmount * half / 100).toFixed(2),
    sgst: +(taxableAmount * half / 100).toFixed(2),
    igst: 0,
    total: +(taxableAmount * (1 + gstRate / 100)).toFixed(2),
    taxableAmount: +taxableAmount.toFixed(2),
  };
};

interface PurchaseItem {
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  gst_rate: number;
}

export function AdminPurchases() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("purchases");
  const [expenseForm, setExpenseForm] = useState({ category_id: "", amount: 0, description: "", payment_method: "cash", reference_number: "" });
  const [showExpense, setShowExpense] = useState(false);

  const { data: purchases } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_bills").select("*, suppliers(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*, expense_categories(name)").order("expense_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        category_id: expenseForm.category_id || null,
        amount: expenseForm.amount,
        description: expenseForm.description || null,
        payment_method: expenseForm.payment_method,
        reference_number: expenseForm.reference_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      setShowExpense(false);
      setExpenseForm({ category_id: "", amount: 0, description: "", payment_method: "cash", reference_number: "" });
      toast.success("Expense recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalPurchases = purchases?.reduce((s, p) => s + Number(p.total), 0) || 0;
  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const totalPayable = purchases?.reduce((s, p) => s + Number(p.balance_due), 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Purchases & Expenses</h1>
          <p className="text-sm text-muted-foreground">Track all outgoing money</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExpense(true)} className="rounded-xl gap-2">
            <Receipt className="h-4 w-4" /> Add Expense
          </Button>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Purchase Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Purchases", value: `₹${totalPurchases.toLocaleString("en-IN")}`, icon: FileText, color: "text-primary" },
          { label: "Total Expenses", value: `₹${totalExpenses.toLocaleString("en-IN")}`, icon: Receipt, color: "text-secondary" },
          { label: "Payable", value: `₹${totalPayable.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-destructive" },
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="purchases">Purchase Bills</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>

          <div className="rounded-xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!purchases || purchases.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase bills yet</TableCell></TableRow>
                ) : (
                  purchases
                    .filter((p: any) => !search || p.bill_number.toLowerCase().includes(search.toLowerCase()) || ((p as any).suppliers?.name || "").toLowerCase().includes(search.toLowerCase()))
                    .map((bill: any) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                        <TableCell>{(bill as any).suppliers?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(bill.bill_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(bill.total).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">₹{Number(bill.amount_paid).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={bill.payment_status === "paid" ? "default" : bill.payment_status === "partial" ? "secondary" : "destructive"} className="text-xs">
                            {bill.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="rounded-xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!expenses || expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses recorded</TableCell></TableRow>
                ) : (
                  expenses.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">{format(new Date(exp.expense_date), "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{(exp as any).expense_categories?.name || "—"}</Badge></TableCell>
                      <TableCell className="text-sm">{exp.description || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{exp.payment_method}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">₹{Number(exp.amount).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={expenseForm.category_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, category_id: v })}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={expenseForm.amount || ""} onChange={(e) => setExpenseForm({ ...expenseForm, amount: +e.target.value })} className="rounded-lg" /></div>
            <div><Label className="text-xs">Description</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="rounded-lg" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={expenseForm.payment_method} onValueChange={(v) => setExpenseForm({ ...expenseForm, payment_method: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Reference #</Label><Input value={expenseForm.reference_number} onChange={(e) => setExpenseForm({ ...expenseForm, reference_number: e.target.value })} className="rounded-lg" placeholder="Optional" /></div>
            </div>
            <Button className="w-full rounded-xl" disabled={expenseForm.amount <= 0} onClick={() => addExpense.mutate()}>Record Expense</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Bill Dialog */}
      {showCreate && <CreatePurchaseBillDialog open={showCreate} onClose={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["admin-purchases"] }); }} suppliers={suppliers || []} />}
    </div>
  );
}

function CreatePurchaseBillDialog({ open, onClose, suppliers }: { open: boolean; onClose: () => void; suppliers: any[] }) {
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([{ description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0, discount: 0, gst_rate: 5 }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const addRow = () => setItems([...items, { description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0, discount: 0, gst_rate: 5 }]);
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: any) => { const u = [...items]; (u[idx] as any)[field] = value; setItems(u); };

  const itemTotals = items.map((item) => calcGST(item.quantity * item.unit_price - item.discount, item.gst_rate));
  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const totalDiscount = items.reduce((s, item) => s + item.discount, 0);
  const taxableTotal = itemTotals.reduce((s, t) => s + t.taxableAmount, 0);
  const cgstTotal = itemTotals.reduce((s, t) => s + t.cgst, 0);
  const sgstTotal = itemTotals.reduce((s, t) => s + t.sgst, 0);
  const grandTotal = itemTotals.reduce((s, t) => s + t.total, 0);

  const handleCreate = async () => {
    if (items.some((i) => !i.description || i.unit_price <= 0)) { toast.error("Fill all items"); return; }
    setLoading(true);
    try {
      const { data: billNum } = await supabase.rpc("generate_purchase_bill_number");
      const { data: bill, error } = await supabase.from("purchase_bills").insert({
        bill_number: billNum, supplier_id: supplierId || null,
        subtotal, discount: totalDiscount, taxable_amount: taxableTotal,
        cgst_total: cgstTotal, sgst_total: sgstTotal, igst_total: 0,
        total: grandTotal, balance_due: grandTotal, payment_status: "unpaid", notes: notes || null,
      }).select().single();
      if (error) throw error;

      const billItems = items.map((item, idx) => ({
        purchase_bill_id: bill.id, description: item.description, hsn_code: item.hsn_code || null,
        quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, discount: item.discount,
        taxable_amount: itemTotals[idx].taxableAmount, gst_rate: item.gst_rate,
        cgst: itemTotals[idx].cgst, sgst: itemTotals[idx].sgst, igst: 0, total: itemTotals[idx].total,
      }));
      const { error: itemsErr } = await supabase.from("purchase_bill_items").insert(billItems);
      if (itemsErr) throw itemsErr;

      // Update supplier balance
      if (supplierId) {
        await supabase.from("suppliers").update({ balance: (suppliers.find(s => s.id === supplierId)?.balance || 0) + grandTotal }).eq("id", supplierId);
      }

      toast.success(`Purchase Bill ${billNum} created`);
      onClose();
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">Create Purchase Bill</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Items</Label>
            <Button variant="outline" size="sm" onClick={addRow} className="rounded-lg gap-1 text-xs"><Plus className="h-3 w-3" /> Add Row</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left text-xs">Description</th>
                  <th className="p-2 text-center text-xs w-16">Qty</th>
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
                    <td className="p-1"><Input value={item.description} onChange={(e) => updateRow(idx, "description", e.target.value)} className="h-8 text-xs rounded-md" /></td>
                    <td className="p-1"><Input type="number" min={1} value={item.quantity} onChange={(e) => updateRow(idx, "quantity", +e.target.value)} className="h-8 text-xs text-center rounded-md" /></td>
                    <td className="p-1"><Input type="number" min={0} value={item.unit_price} onChange={(e) => updateRow(idx, "unit_price", +e.target.value)} className="h-8 text-xs text-right rounded-md" /></td>
                    <td className="p-1"><Input type="number" min={0} value={item.discount} onChange={(e) => updateRow(idx, "discount", +e.target.value)} className="h-8 text-xs text-right rounded-md" /></td>
                    <td className="p-1">
                      <Select value={String(item.gst_rate)} onValueChange={(v) => updateRow(idx, "gst_rate", +v)}>
                        <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                        <SelectContent>{["0","5","12","18","28"].map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1 text-right text-xs font-semibold">₹{itemTotals[idx]?.total.toFixed(2)}</td>
                    <td className="p-1">{items.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(idx)}>×</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-₹{totalDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{cgstTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{sgstTotal.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold text-base"><span>Grand Total</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg text-sm" /></div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleCreate} disabled={loading} className="rounded-xl gap-2">
            {loading ? "Creating..." : <><FileText className="h-4 w-4" /> Create Bill</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
