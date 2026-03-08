import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, CheckCircle, Package, Truck, X } from "lucide-react";
import { format } from "date-fns";
import { DateRangeFilter, filterByDateRange } from "./DateRangeFilter";

const STATUS_OPTIONS = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-200",
  packed: "bg-purple-500/10 text-purple-700 border-purple-200",
  out_for_delivery: "bg-orange-500/10 text-orange-700 border-orange-200",
  delivered: "bg-green-500/10 text-green-700 border-green-200",
};

export function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      // Send push notification to the customer
      const order = orders?.find((o: any) => o.id === id);
      if (order?.user_id) {
        const statusLabels: Record<string, string> = {
          confirmed: "Your order has been confirmed! ✅",
          packed: "Your order is packed and ready! 📦",
          out_for_delivery: "Your order is out for delivery! 🚚",
          delivered: "Your order has been delivered! 🎉",
          cancelled: "Your order has been cancelled ❌",
        };
        const body = statusLabels[status] || `Order status updated to ${status}`;
        try {
          await supabase.functions.invoke("push-notifications", {
            body: {
              action: "send",
              userId: order.user_id,
              title: "🛒 ApniDukaan Order Update",
              body,
              url: "/orders",
            },
          });
        } catch (e) {
          console.error("Push notification failed:", e);
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Status updated"); },
  });

  let filtered = orders?.filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (typeFilter !== "all" && o.customer_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.id.includes(q) || o.customer_name?.toLowerCase().includes(q) || o.phone?.includes(q);
    }
    return true;
  }) || [];

  filtered = filterByDateRange(filtered, dateFrom, dateTo, (o: any) => new Date(o.created_at));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by ID, name, phone..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

      {/* Orders Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No orders found</TableCell></TableRow>
            )}
            {filtered.map((order: any) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{order.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{order.phone || "—"}</p>
                  {order.village && <p className="text-xs text-muted-foreground">{order.village}</p>}
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">
                  {(order.items as any[])?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                </TableCell>
                <TableCell className="font-semibold">₹{order.total}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full text-xs capitalize">{order.customer_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`rounded-full text-xs border capitalize ${STATUS_COLORS[order.status] || ""}`}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {order.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateStatus.mutate({ id: order.id, status: "confirmed" })} title="Accept">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: order.id, status: "cancelled" })} title="Cancel">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {order.status === "confirmed" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-600" onClick={() => updateStatus.mutate({ id: order.id, status: "packed" })} title="Mark Packed">
                        <Package className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {order.status === "packed" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600" onClick={() => updateStatus.mutate({ id: order.id, status: "out_for_delivery" })} title="Out for Delivery">
                        <Truck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {order.status === "out_for_delivery" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateStatus.mutate({ id: order.id, status: "delivered" })} title="Delivered">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(order.created_at), "dd MMM, hh:mm a")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
