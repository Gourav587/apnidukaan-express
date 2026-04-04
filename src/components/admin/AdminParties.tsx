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
import { Plus, Search, Eye, Users, Building2, IndianRupee } from "lucide-react";

export function AdminParties() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [viewParty, setViewParty] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", gstin: "", email: "", party_type: "supplier", notes: "" });

  const { data: suppliers } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: khataCustomers } = useQuery({
    queryKey: ["admin-khata-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("khata_customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert({
        name: form.name, phone: form.phone || null, address: form.address || null,
        gstin: form.gstin || null, email: form.email || null, party_type: form.party_type, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setShowAdd(false);
      setForm({ name: "", phone: "", address: "", gstin: "", email: "", party_type: "supplier", notes: "" });
      toast.success("Party added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Merge suppliers + khata customers for unified view
  const allParties = [
    ...(suppliers || []).map((s: any) => ({ ...s, source: "supplier" })),
    ...(khataCustomers || []).map((c: any) => ({ ...c, party_type: "customer", source: "khata", gstin: null, email: null, notes: null })),
  ];

  const filtered = allParties
    .filter((p) => tab === "all" || p.party_type === tab)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search));

  const totalReceivable = allParties.filter((p) => p.party_type === "customer").reduce((s, p) => s + Math.max(0, Number(p.balance)), 0);
  const totalPayable = allParties.filter((p) => p.party_type === "supplier").reduce((s, p) => s + Math.max(0, Number(p.balance)), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Parties</h1>
          <p className="text-sm text-muted-foreground">Customers & Suppliers — Tally-style ledger</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Add Party
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Parties", value: allParties.length, icon: Users, color: "text-primary" },
          { label: "Suppliers", value: allParties.filter((p) => p.party_type === "supplier").length, icon: Building2, color: "text-secondary" },
          { label: "Receivable", value: `₹${totalReceivable.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600" },
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

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="customer">Customers</TabsTrigger>
            <TabsTrigger value="supplier">Suppliers</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </div>

      <div className="rounded-xl border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No parties found</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={`${p.source}-${p.id}`}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant={p.party_type === "supplier" ? "secondary" : "default"} className="text-xs capitalize">{p.party_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{p.gstin || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${Number(p.balance) > 0 ? "text-destructive" : "text-green-600"}`}>
                    ₹{Math.abs(Number(p.balance)).toLocaleString("en-IN")}
                    {Number(p.balance) > 0 && <span className="text-xs ml-1">Dr</span>}
                    {Number(p.balance) < 0 && <span className="text-xs ml-1">Cr</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewParty(p)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Party Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Add Party</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Party Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.party_type} onValueChange={(v) => setForm({ ...form, party_type: v })}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg" /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg" /></div>
            </div>
            <div><Label className="text-xs">GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="rounded-lg" placeholder="Optional" /></div>
            <div><Label className="text-xs">Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="rounded-lg" /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" /></div>
            <Button className="w-full rounded-xl" disabled={!form.name} onClick={() => addMutation.mutate()}>Add Party</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Party Statement */}
      {viewParty && <PartyStatement party={viewParty} open={!!viewParty} onClose={() => setViewParty(null)} />}
    </div>
  );
}

function PartyStatement({ party, open, onClose }: { party: any; open: boolean; onClose: () => void }) {
  // For suppliers, fetch purchase bills; for customers, fetch invoices
  const { data: purchaseBills } = useQuery({
    queryKey: ["party-purchases", party.id],
    queryFn: async () => {
      if (party.party_type !== "supplier" && party.party_type !== "both") return [];
      const { data, error } = await supabase.from("purchase_bills").select("*").eq("supplier_id", party.id).order("bill_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && party.source === "supplier",
  });

  const { data: payments } = useQuery({
    queryKey: ["party-payments", party.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_entries").select("*").eq("party_id", party.id).order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && party.source === "supplier",
  });

  const { data: khataTransactions } = useQuery({
    queryKey: ["party-khata", party.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("khata_transactions").select("*").eq("customer_id", party.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && party.source === "khata",
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-3">
            {party.name}
            <Badge variant="secondary" className="capitalize">{party.party_type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            {party.phone && <p>Phone: {party.phone}</p>}
            {party.address && <p>Address: {party.address}</p>}
            {party.gstin && <p>GSTIN: {party.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">Balance: <span className={Number(party.balance) > 0 ? "text-destructive" : "text-green-600"}>₹{Math.abs(Number(party.balance)).toLocaleString("en-IN")}</span></p>
            <p className="text-xs text-muted-foreground">{Number(party.balance) > 0 ? "You owe" : "They owe"}</p>
          </div>
        </div>

        {/* Statement */}
        <div className="rounded-xl border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {party.source === "supplier" && (
                <>
                  {(purchaseBills || []).map((bill: any) => (
                    <TableRow key={`pb-${bill.id}`}>
                      <TableCell className="text-sm">{format(new Date(bill.bill_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>Purchase Bill {bill.bill_number}</TableCell>
                      <TableCell className="text-right text-destructive">₹{Number(bill.total).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                  ))}
                  {(payments || []).map((pay: any) => (
                    <TableRow key={`pay-${pay.id}`}>
                      <TableCell className="text-sm">{format(new Date(pay.payment_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>Payment ({pay.payment_method})</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right text-green-600">₹{Number(pay.amount).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {party.source === "khata" && (khataTransactions || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>{t.description || t.type}</TableCell>
                  <TableCell className="text-right">{t.type === "debit" ? `₹${Number(t.amount).toLocaleString("en-IN")}` : "—"}</TableCell>
                  <TableCell className="text-right">{t.type === "credit" ? `₹${Number(t.amount).toLocaleString("en-IN")}` : "—"}</TableCell>
                </TableRow>
              ))}
              {(!purchaseBills || purchaseBills.length === 0) && (!payments || payments.length === 0) && (!khataTransactions || khataTransactions.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No transactions yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
