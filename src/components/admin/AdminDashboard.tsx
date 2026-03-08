import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingUp, Package, AlertTriangle, IndianRupee, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(22,87%,48%)", "hsl(148,57%,26%)", "hsl(215,16%,47%)", "hsl(0,84%,60%)", "hsl(22,87%,68%)"];

export function AdminDashboard() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  if (isLoading) return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );

  const today = startOfDay(new Date());
  const todayOrders = orders?.filter((o: any) => new Date(o.created_at) >= today) || [];
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const lowStock = products?.filter((p: any) => p.stock < 10) || [];
  const websiteOrders = orders?.filter((o: any) => o.customer_type === "retail") || [];
  const totalRevenue = orders?.reduce((s: number, o: any) => s + (o.total || 0), 0) || 0;

  // Revenue chart - last 7 days
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayOrders = orders?.filter((o: any) => format(new Date(o.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) || [];
    return { day: format(date, "EEE"), revenue: dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0), orders: dayOrders.length };
  });

  // Top products
  const productSales: Record<string, number> = {};
  orders?.forEach((o: any) => {
    (o.items as any[])?.forEach((item: any) => {
      productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name: name.length > 15 ? name.slice(0, 15) + "…" : name, qty }));

  // Orders by status
  const statusCounts = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"].map((s) => ({
    name: s.replace(/_/g, " "),
    value: orders?.filter((o: any) => o.status === s).length || 0,
  }));

  const stats = [
    { icon: ShoppingCart, label: "Orders Today", value: todayOrders.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: IndianRupee, label: "Revenue Today", value: `₹${todayRevenue.toLocaleString()}`, color: "text-secondary", bg: "bg-secondary/10" },
    { icon: Truck, label: "Pending", value: pendingOrders.length, color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: AlertTriangle, label: "Low Stock", value: lowStock.length, color: "text-destructive", bg: "bg-destructive/10" },
    { icon: TrendingUp, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-primary", bg: "bg-primary/10" },
    { icon: Package, label: "Total Orders", value: orders?.length || 0, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back! Here's your store overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="revenue" fill="hsl(22,87%,48%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Orders Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="orders" stroke="hsl(148,57%,26%)" strokeWidth={2} dot={{ fill: "hsl(148,57%,26%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Products */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <Badge variant="secondary" className="rounded-full">{p.qty} sold</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusCounts.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center">
            {statusCounts.filter(s => s.value > 0).map((s, i) => (
              <div key={s.name} className="flex items-center gap-1 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock Alerts
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">All stock levels are healthy!</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {lowStock.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-destructive/5 p-2.5">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <Badge variant={p.stock <= 0 ? "destructive" : "secondary"} className="rounded-full shrink-0">
                    {p.stock <= 0 ? "Out" : `${p.stock} left`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
