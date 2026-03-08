import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, CheckCircle, Package, Truck, X, ChevronLeft, ChevronRight } from "lucide-react";
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

const ORDERS_PER_PAGE = 25;

export function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter, typeFilter, search, dateFrom?.toISOString(), dateTo?.toISOString(), page],
    queryFn: async () => {
      let query = supabase.from("orders").select("*", { count: "exact" });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (typeFilter !== "all") query = query.eq("customer_type", typeFilter);
      if (search) {
        query = query.or(`id.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const from = (page - 1) * ORDERS_PER_PAGE;
      const to = from + ORDERS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { orders: data || [], total: count || 0 };
    },
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.total || 0;

  // Separate query for updateStatus to find the order's user_id for push notification
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Fetch the specific order for notification
      const { data: order } = await supabase.from("orders").select("user_id").eq("id", id).maybeSingle();
      
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

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
            body: { action: "send", userId: order.user_id, title: "🛒 ApniDukaan Order Update", body, url: "/orders" },
          });
        } catch (e) {
          console.error("Push notification failed:", e);
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Status updated"); },
  });

  const totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);

  const handleFilterChange = (setter: (v: any) => void) => (val: any) => { setter(val); setPage(1); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">{totalCount} orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by ID, name, phone..." className="pl-9 rounded-xl" value={search} onChange={(e) => handleFilterChange(setSearch)(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={handleFilterChange(setDateFrom)} onToChange={handleFilterChange(setDateTo)} />

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
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{isLoading ? "Loading..." : "No orders found"}</TableCell></TableRow>
            )}
            {orders.map((order: any) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="contents">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-muted-foreground px-1">…</span>
                    )}
                    <Button
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl h-8 w-8 p-0"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </span>
                ))}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
