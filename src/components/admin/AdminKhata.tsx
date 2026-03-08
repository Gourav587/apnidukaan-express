import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, UserPlus, IndianRupee, ArrowDownCircle, ArrowUpCircle, Trash2, History, Wallet } from "lucide-react";
import { format } from "date-fns";
import { DateRangeFilter, filterByDateRange } from "./DateRangeFilter";

// ─── Add / Edit Customer Dialog ────────────────────────────────
function CustomerDialog({ customer, onSaved, trigger }: { customer?: any; onSaved: () => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    try {
      if (customer) {
        const { error } = await supabase.from("khata_customers").update({ name, phone: phone || null, address: address || null }).eq("id", customer.id);
        if (error) throw error;
        toast.success("Customer updated");
      } else {
        const { error } = await supabase.from("khata_customers").insert({ name, phone: phone || null, address: address || null });
        if (error) throw error;
        toast.success("Customer added");
      }
      onSaved();
      setOpen(false);
      if (!customer) { setName(""); setPhone(""); setAddress(""); }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{customer ? "Edit Customer" : "Add Khata Customer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input className="rounded-xl mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input className="rounded-xl mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input className="rounded-xl mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Village / Area" />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving..." : customer ? "Update" : "Add Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment Dialog ─────────────────────────────────────
function RecordPaymentDialog({ customer, onSaved }: { customer: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      const { error: txError } = await supabase.from("khata_transactions").insert({
        customer_id: customer.id,
        type: "payment",
        amount: amt,
        description: description || `Payment received`,
      });
      if (txError) throw txError;
      const newBalance = Number(customer.balance) - amt;
      const { error: balError } = await supabase.from("khata_customers").update({ balance: newBalance }).eq("id", customer.id);
      if (balError) throw balError;
      toast.success(`₹${amt} payment recorded for ${customer.name}`);
      onSaved();
      setOpen(false);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 rounded-xl text-xs h-7">
          <ArrowDownCircle className="h-3 w-3" /> Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Record Payment — {customer.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Outstanding: <span className="font-semibold text-destructive">₹{Number(customer.balance).toFixed(2)}</span></p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Amount (₹) *</Label>
            <Input type="number" min={1} className="rounded-xl mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
          </div>
          <div>
            <Label className="text-xs">Note</Label>
            <Input className="rounded-xl mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cash payment" />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-xl">
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction History Dialog ────────────────────────────────
function TransactionHistoryDialog({ customer }: { customer: any }) {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: transactions } = useQuery({
    queryKey: ["khata-transactions", customer.id, open],
    queryFn: async () => {
      if (!open) return [];
      const { data } = await supabase
        .from("khata_transactions")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const filtered = filterByDateRange(transactions || [], dateFrom, dateTo, (tx: any) => new Date(tx.created_at));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 rounded-xl text-xs h-7">
          <History className="h-3 w-3" /> History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Khata — {customer.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Balance: <span className={Number(customer.balance) > 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>₹{Number(customer.balance).toFixed(2)}</span>
          </p>
        </DialogHeader>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.created_at), "dd MMM, hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "credit" ? "destructive" : "default"} className="rounded-full text-[10px] gap-1">
                        {tx.type === "credit" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{tx.description || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${tx.type === "credit" ? "text-destructive" : "text-primary"}`}>
                      {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Khata Component ──────────────────────────────────────
export function AdminKhata() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: customers } = useQuery({
    queryKey: ["khata-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("khata_customers").select("*").order("name");
      return data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["khata-customers"] });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} and all their transactions?`)) return;
    const { error } = await supabase.from("khata_customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} removed from khata`);
    invalidate();
  };

  const filtered = (customers || []).filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const totalOutstanding = filtered.reduce((s, c: any) => s + Math.max(0, Number(c.balance)), 0);
  const customersWithCredit = filtered.filter((c: any) => Number(c.balance) > 0).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Khata (Credit Book)</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} customers</p>
        </div>
        <CustomerDialog
          onSaved={invalidate}
          trigger={<Button className="gap-2 rounded-xl"><UserPlus className="h-4 w-4" /> Add Customer</Button>}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><IndianRupee className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Outstanding</p>
              <p className="font-heading font-bold text-xl text-destructive">₹{totalOutstanding.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Credit Customers</p>
              <p className="font-heading font-bold text-xl">{customersWithCredit}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2"><UserPlus className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="font-heading font-bold text-xl">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-heading font-semibold">No khata customers yet</p>
          <p className="text-sm text-muted-foreground">Add customers who buy on credit</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{c.address || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold ${Number(c.balance) > 0 ? "text-destructive" : "text-primary"}`}>
                      ₹{Number(c.balance).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <RecordPaymentDialog customer={c} onSaved={invalidate} />
                      <TransactionHistoryDialog customer={c} />
                      <CustomerDialog
                        customer={c}
                        onSaved={invalidate}
                        trigger={<Button size="sm" variant="ghost" className="text-xs h-7 rounded-xl">Edit</Button>}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id, c.name)}>
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
