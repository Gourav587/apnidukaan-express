import { useState, useEffect, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search, Moon, Sun, LogOut, User, ShoppingCart, PackageCheck, AlertTriangle, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "new_order" | "low_stock" | "status_change";
  title: string;
  description: string;
  time: string;
  read: boolean;
  link?: string;
}

export function AdminHeader() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const notifs: Notification[] = [];

    // Fetch recent pending orders
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("id, customer_name, total, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (pendingOrders) {
      pendingOrders.forEach((order) => {
        notifs.push({
          id: `order-${order.id}`,
          type: "new_order",
          title: "New Order",
          description: `${order.customer_name || "Customer"} — ₹${order.total}`,
          time: order.created_at,
          read: false,
          link: "/admin/orders",
        });
      });
    }

    // Fetch low stock products (stock < 10)
    const { data: lowStockProducts } = await supabase
      .from("products")
      .select("id, name, stock")
      .lt("stock", 10)
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(5);

    if (lowStockProducts) {
      lowStockProducts.forEach((product) => {
        notifs.push({
          id: `stock-${product.id}`,
          type: "low_stock",
          title: "Low Stock Alert",
          description: `${product.name} — only ${product.stock} left`,
          time: new Date().toISOString(),
          read: false,
          link: "/admin/inventory",
        });
      });
    }

    // Fetch recently updated orders (delivered/cancelled in last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUpdates } = await supabase
      .from("orders")
      .select("id, customer_name, status, updated_at")
      .in("status", ["delivered", "cancelled"])
      .gte("updated_at", yesterday)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (recentUpdates) {
      recentUpdates.forEach((order) => {
        notifs.push({
          id: `update-${order.id}`,
          type: "status_change",
          title: order.status === "delivered" ? "Order Delivered" : "Order Cancelled",
          description: `${order.customer_name || "Customer"}'s order ${order.status}`,
          time: order.updated_at,
          read: true,
          link: "/admin/orders",
        });
      });
    }

    // Sort by time, newest first
    notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.read).length);
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(1174.66, now + 0.15, 0.2);
      setTimeout(() => ctx.close(), 1000);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin-header-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        playNotificationSound();
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, playNotificationSound]);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_order": return <ShoppingCart className="h-4 w-4 text-primary" />;
      case "low_stock": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "status_change": return <PackageCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 bg-background/95 backdrop-blur px-4">
      <SidebarTrigger className="shrink-0" />

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders, products, customers..."
          className="h-9 rounded-lg pl-9 bg-muted/50 border-0 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={toggleDark}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none border-b border-border/30 last:border-0 ${
                      !notif.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => notif.link && navigate(notif.link)}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{notif.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notif.time), { addSuffix: true })}
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                A
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2"><User className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate("/admin-login"); }}>
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
