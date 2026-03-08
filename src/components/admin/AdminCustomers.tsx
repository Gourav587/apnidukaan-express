import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function AdminCustomers() {
  const [search, setSearch] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => { const { data } = await supabase.from("orders").select("*"); return data || []; },
  });

  const customers = profiles?.map((p: any) => {
    const customerOrders = orders?.filter((o: any) => o.user_id === p.user_id) || [];
    const totalSpent = customerOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const lastOrder = customerOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return { ...p, orderCount: customerOrders.length, totalSpent, lastOrder };
  }) || [];

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.village?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} customers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-heading font-bold">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total Customers</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-heading font-bold">{customers.filter(c => c.customer_type === "wholesale").length}</p>
          <p className="text-xs text-muted-foreground">Wholesale</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-heading font-bold">{customers.filter(c => c.orderCount > 1).length}</p>
          <p className="text-xs text-muted-foreground">Repeat Customers</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-heading font-bold">₹{customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, phone, village..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Village</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-30" />No customers found
              </TableCell></TableRow>
            )}
            {filtered.sort((a, b) => b.totalSpent - a.totalSpent).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name || "—"}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.village || "—"}</TableCell>
                <TableCell><Badge variant={c.customer_type === "wholesale" ? "default" : "secondary"} className="rounded-full capitalize">{c.customer_type}</Badge></TableCell>
                <TableCell className="font-medium">{c.orderCount}</TableCell>
                <TableCell className="font-semibold text-primary">₹{c.totalSpent.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.lastOrder ? format(new Date(c.lastOrder.created_at), "dd MMM yyyy") : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
