import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, BookOpen, Users } from "lucide-react";
import { format } from "date-fns";

export function AdminWholesale() {
  const queryClient = useQueryClient();
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", type: "debit", amount: "", description: "" });

  const { data: customers } = useQuery({
    queryKey: ["wholesale-customers"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*").eq("customer_type", "wholesale"); return data || []; },
  });

  const { data: ledger } = useQuery({
    queryKey: ["admin-ledger"],
    queryFn: async () => { const { data } = await supabase.from("ledger").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const addEntry = useMutation({
    mutationFn: async (entry: any) => {
      const { data: last } = await supabase.from("ledger").select("balance").eq("user_id", entry.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const prev = last?.balance || 0;
      const balance = entry.type === "payment" ? prev - Number(entry.amount) : prev + Number(entry.amount);
      const { error } = await supabase.from("ledger").insert({ user_id: entry.user_id, type: entry.type, amount: Number(entry.amount), balance, description: entry.description });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-ledger"] }); setLedgerOpen(false); setForm({ user_id: "", type: "debit", amount: "", description: "" }); toast.success("Entry added"); },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Wholesale</h1>
          <p className="text-sm text-muted-foreground">Manage wholesale customers & ledger</p>
        </div>
        <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
          <DialogTrigger asChild><Button className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addEntry.mutate(form); }} className="space-y-3">
              <div><Label>Customer</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{customers?.map((c: any) => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.phone || c.user_id.slice(0, 8)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (Purchase)</SelectItem>
                    <SelectItem value="payment">Payment Received</SelectItem>
                    <SelectItem value="credit">Credit Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><Label>Description</Label><Input className="rounded-xl mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full rounded-xl" disabled={!form.user_id || !form.amount}>Add Entry</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customers */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> Customers</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Village</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {!customers?.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No wholesale customers</TableCell></TableRow>}
            {customers?.map((c: any) => {
              const bal = ledger?.filter((l: any) => l.user_id === c.user_id)?.[0]?.balance || 0;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name || "—"}</TableCell>
                  <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{c.village || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${bal > 0 ? "text-destructive" : "text-secondary"}`}>₹{Math.abs(bal)} {bal > 0 && <span className="text-xs">(due)</span>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Ledger */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Ledger</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {!ledger?.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries</TableCell></TableRow>}
            {ledger?.map((e: any) => {
              const customer = customers?.find((c: any) => c.user_id === e.user_id);
              return (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{format(new Date(e.created_at), "dd MMM, hh:mm a")}</TableCell>
                  <TableCell className="text-sm font-medium">{customer?.name || e.user_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant={e.type === "payment" ? "secondary" : "destructive"} className="rounded-full text-xs">{e.type}</Badge></TableCell>
                  <TableCell className="text-sm">{e.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium">₹{e.amount}</TableCell>
                  <TableCell className="text-right font-semibold">₹{e.balance}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
