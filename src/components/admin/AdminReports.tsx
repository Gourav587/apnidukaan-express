import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { BarChart3, BookOpen, FileText, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";

export function AdminReports() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: invoices } = useQuery({
    queryKey: ["report-invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*").order("invoice_date"); return data || []; },
  });
  const { data: purchases } = useQuery({
    queryKey: ["report-purchases"],
    queryFn: async () => { const { data } = await supabase.from("purchase_bills").select("*, suppliers(name)").order("bill_date"); return data || []; },
  });
  const { data: expenses } = useQuery({
    queryKey: ["report-expenses"],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*, expense_categories(name)").order("expense_date"); return data || []; },
  });
  const { data: suppliers } = useQuery({
    queryKey: ["report-suppliers"],
    queryFn: async () => { const { data } = await supabase.from("suppliers").select("*"); return data || []; },
  });

  const inRange = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, { start: parseISO(dateFrom), end: parseISO(dateTo + "T23:59:59") });
    } catch { return false; }
  };

  const filteredInvoices = useMemo(() => invoices?.filter((i: any) => inRange(i.invoice_date)) || [], [invoices, dateFrom, dateTo]);
  const filteredPurchases = useMemo(() => purchases?.filter((p: any) => inRange(p.bill_date)) || [], [purchases, dateFrom, dateTo]);
  const filteredExpenses = useMemo(() => expenses?.filter((e: any) => inRange(e.expense_date)) || [], [expenses, dateFrom, dateTo]);

  // P&L
  const totalSales = filteredInvoices.reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalSalesTax = filteredInvoices.reduce((s: number, i: any) => s + Number(i.cgst_total) + Number(i.sgst_total) + Number(i.igst_total), 0);
  const totalPurchases = filteredPurchases.reduce((s: number, p: any) => s + Number(p.total), 0);
  const totalPurchaseTax = filteredPurchases.reduce((s: number, p: any) => s + Number(p.cgst_total) + Number(p.sgst_total) + Number(p.igst_total), 0);
  const totalExpenseAmt = filteredExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenseAmt;

  // GST Summary
  const salesCGST = filteredInvoices.reduce((s: number, i: any) => s + Number(i.cgst_total), 0);
  const salesSGST = filteredInvoices.reduce((s: number, i: any) => s + Number(i.sgst_total), 0);
  const purchaseCGST = filteredPurchases.reduce((s: number, p: any) => s + Number(p.cgst_total), 0);
  const purchaseSGST = filteredPurchases.reduce((s: number, p: any) => s + Number(p.sgst_total), 0);
  const netCGST = salesCGST - purchaseCGST;
  const netSGST = salesSGST - purchaseSGST;

  // Outstanding
  const receivables = filteredInvoices.filter((i: any) => Number(i.balance_due) > 0);
  const payables = filteredPurchases.filter((p: any) => Number(p.balance_due) > 0);
  const totalReceivable = receivables.reduce((s: number, i: any) => s + Number(i.balance_due), 0);
  const totalPayable = payables.reduce((s: number, p: any) => s + Number(p.balance_due), 0);

  // Day Book entries
  const dayBookEntries = useMemo(() => {
    const entries: { date: string; type: string; party: string; ref: string; debit: number; credit: number }[] = [];
    filteredInvoices.forEach((i: any) => entries.push({ date: i.invoice_date, type: "Sale", party: i.customer_name || "Walk-in", ref: i.invoice_number, debit: 0, credit: Number(i.total) }));
    filteredPurchases.forEach((p: any) => entries.push({ date: p.bill_date, type: "Purchase", party: (p as any).suppliers?.name || "—", ref: p.bill_number, debit: Number(p.total), credit: 0 }));
    filteredExpenses.forEach((e: any) => entries.push({ date: e.expense_date, type: "Expense", party: (e as any).expense_categories?.name || "—", ref: "—", debit: Number(e.amount), credit: 0 }));
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, filteredPurchases, filteredExpenses]);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Tally-style financial reports</p>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg w-40" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg w-40" /></div>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="daybook">Day Book</TabsTrigger>
          <TabsTrigger value="gst">GST Summary</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pnl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Income</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Sales Revenue</span><span className="font-semibold">{fmt(totalSales)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax Collected (GST)</span><span>{fmt(totalSalesTax)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold text-green-600"><span>Total Income</span><span>{fmt(totalSales)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Expenses</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Purchases</span><span className="font-semibold">{fmt(totalPurchases)}</span></div>
                <div className="flex justify-between"><span>Operating Expenses</span><span className="font-semibold">{fmt(totalExpenseAmt)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Input Tax (GST)</span><span>{fmt(totalPurchaseTax)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold text-destructive"><span>Total Outgoings</span><span>{fmt(totalPurchases + totalExpenseAmt)}</span></div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl border bg-card p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className={`font-heading text-xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(grossProfit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operating Expenses</p>
                  <p className="font-heading text-xl font-bold text-destructive">{fmt(totalExpenseAmt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`font-heading text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(netProfit)}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Day Book */}
        <TabsContent value="daybook">
          <div className="rounded-xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Ref #</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries in selected period</TableCell></TableRow>
                ) : (
                  dayBookEntries.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant={entry.type === "Sale" ? "default" : entry.type === "Purchase" ? "secondary" : "outline"} className="text-xs">{entry.type}</Badge></TableCell>
                      <TableCell className="text-sm">{entry.party}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.ref}</TableCell>
                      <TableCell className="text-right text-destructive">{entry.debit > 0 ? fmt(entry.debit) : "—"}</TableCell>
                      <TableCell className="text-right text-green-600">{entry.credit > 0 ? fmt(entry.credit) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
                {dayBookEntries.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4} className="text-right">Total</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(dayBookEntries.reduce((s, e) => s + e.debit, 0))}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(dayBookEntries.reduce((s, e) => s + e.credit, 0))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* GST Summary */}
        <TabsContent value="gst">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h3 className="font-heading font-semibold">Output GST (Sales)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>CGST Collected</span><span className="font-semibold">{fmt(salesCGST)}</span></div>
                  <div className="flex justify-between"><span>SGST Collected</span><span className="font-semibold">{fmt(salesSGST)}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold"><span>Total Output Tax</span><span>{fmt(salesCGST + salesSGST)}</span></div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h3 className="font-heading font-semibold">Input GST (Purchases)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>CGST Paid</span><span className="font-semibold">{fmt(purchaseCGST)}</span></div>
                  <div className="flex justify-between"><span>SGST Paid</span><span className="font-semibold">{fmt(purchaseSGST)}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold"><span>Total Input Tax</span><span>{fmt(purchaseCGST + purchaseSGST)}</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-heading font-semibold mb-3">Net GST Liability</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">CGST Payable</p>
                  <p className={`font-heading text-lg font-bold ${netCGST >= 0 ? "text-destructive" : "text-green-600"}`}>{fmt(Math.abs(netCGST))}</p>
                  <p className="text-[10px] text-muted-foreground">{netCGST >= 0 ? "To Pay" : "ITC Available"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SGST Payable</p>
                  <p className={`font-heading text-lg font-bold ${netSGST >= 0 ? "text-destructive" : "text-green-600"}`}>{fmt(Math.abs(netSGST))}</p>
                  <p className="text-[10px] text-muted-foreground">{netSGST >= 0 ? "To Pay" : "ITC Available"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Net GST</p>
                  <p className={`font-heading text-xl font-bold ${(netCGST + netSGST) >= 0 ? "text-destructive" : "text-green-600"}`}>{fmt(Math.abs(netCGST + netSGST))}</p>
                  <p className="text-[10px] text-muted-foreground">{(netCGST + netSGST) >= 0 ? "Net Payable" : "Net ITC"}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Outstanding */}
        <TabsContent value="outstanding">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Receivable</p>
                <p className="font-heading text-2xl font-bold text-green-600">{fmt(totalReceivable)}</p>
                <p className="text-xs text-muted-foreground">{receivables.length} invoices</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Payable</p>
                <p className="font-heading text-2xl font-bold text-destructive">{fmt(totalPayable)}</p>
                <p className="text-xs text-muted-foreground">{payables.length} bills</p>
              </div>
            </div>

            <h3 className="font-heading font-semibold">Receivables (Unpaid Sales Invoices)</h3>
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No outstanding receivables</TableCell></TableRow>
                  ) : receivables.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-sm">{i.invoice_number}</TableCell>
                      <TableCell>{i.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(i.invoice_date), "dd MMM")}</TableCell>
                      <TableCell className="text-right">{fmt(Number(i.total))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(i.amount_paid))}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{fmt(Number(i.balance_due))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <h3 className="font-heading font-semibold">Payables (Unpaid Purchase Bills)</h3>
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No outstanding payables</TableCell></TableRow>
                  ) : payables.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.bill_number}</TableCell>
                      <TableCell>{(p as any).suppliers?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(p.bill_date), "dd MMM")}</TableCell>
                      <TableCell className="text-right">{fmt(Number(p.total))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(p.amount_paid))}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{fmt(Number(p.balance_due))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
