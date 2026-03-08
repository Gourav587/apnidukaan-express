import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const COLORS = ["hsl(22,87%,48%)", "hsl(148,57%,26%)", "hsl(215,16%,47%)", "hsl(0,84%,60%)", "hsl(22,87%,68%)", "hsl(148,57%,40%)"];

export function AdminAnalytics() {
  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => { const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*"); return data || []; },
  });

  // Daily revenue (last 14 days)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayOrders = orders?.filter((o: any) => format(new Date(o.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) || [];
    return { day: format(date, "dd MMM"), revenue: dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0), orders: dayOrders.length };
  });

  // Monthly revenue (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date); const end = endOfMonth(date);
    const monthOrders = orders?.filter((o: any) => { const d = new Date(o.created_at); return d >= start && d <= end; }) || [];
    return { month: format(date, "MMM yy"), revenue: monthOrders.reduce((s: number, o: any) => s + (o.total || 0), 0), orders: monthOrders.length };
  });

  // Top products
  const productSales: Record<string, { qty: number; revenue: number }> = {};
  orders?.forEach((o: any) => {
    (o.items as any[])?.forEach((item: any) => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
      productSales[item.name].qty += item.quantity || 1;
      productSales[item.name].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8).map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, ...d }));

  // Top villages
  const villageSales: Record<string, number> = {};
  orders?.forEach((o: any) => { if (o.village) villageSales[o.village] = (villageSales[o.village] || 0) + (o.total || 0); });
  const topVillages = Object.entries(villageSales).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, revenue]) => ({ name, revenue }));

  // Best customers
  const customerSpend: Record<string, number> = {};
  orders?.forEach((o: any) => { if (o.user_id) customerSpend[o.user_id] = (customerSpend[o.user_id] || 0) + (o.total || 0); });
  const topCustomers = Object.entries(customerSpend).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([uid, spent]) => {
    const profile = profiles?.find((p: any) => p.user_id === uid);
    return { name: profile?.name || uid.slice(0, 8), spent };
  });

  const totalRevenue = orders?.reduce((s: number, o: any) => s + (o.total || 0), 0) || 0;
  const avgOrderValue = orders?.length ? Math.round(totalRevenue / orders.length) : 0;

  const exportCSV = () => {
    const rows = [["Date", "Order ID", "Customer", "Total", "Status"]];
    orders?.forEach((o: any) => rows.push([format(new Date(o.created_at), "yyyy-MM-dd"), o.id, o.customer_name || "", o.total, o.status]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales-report.csv"; a.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Track your store performance</p>
        </div>
        <Button variant="outline" className="rounded-xl gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-heading font-bold text-primary">₹{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Revenue</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-heading font-bold">{orders?.length || 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-heading font-bold">₹{avgOrderValue}</p><p className="text-xs text-muted-foreground">Avg Order Value</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-heading font-bold">{profiles?.length || 0}</p><p className="text-xs text-muted-foreground">Total Customers</p></div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList>
        <TabsContent value="daily">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-heading font-semibold mb-4">Daily Revenue (14 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="revenue" fill="hsl(22,87%,48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        <TabsContent value="monthly">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-heading font-semibold mb-4">Monthly Revenue (6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(148,57%,26%)" strokeWidth={2} dot={{ fill: "hsl(148,57%,26%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Products */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {topProducts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                <span className="flex-1 text-sm truncate">{p.name}</span>
                <Badge variant="secondary" className="rounded-full text-xs">₹{p.revenue.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Villages */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Top Villages</h3>
          {topVillages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No data yet</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={topVillages} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="revenue">
                  {topVillages.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {topVillages.map((v, i) => (
              <div key={v.name} className="flex items-center gap-1 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{v.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Customers */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Best Customers</h3>
          <div className="space-y-3">
            {topCustomers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>}
            {topCustomers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">{i + 1}</span>
                <span className="flex-1 text-sm truncate">{c.name}</span>
                <Badge variant="secondary" className="rounded-full text-xs">₹{c.spent.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
