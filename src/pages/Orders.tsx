import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "sonner";
import { Package, CheckCircle, Truck, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const STATUS_STEPS = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  confirmed: <CheckCircle className="h-4 w-4" />,
  packed: <Package className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4" />,
};

const Orders = () => {
  const addItem = useCartStore((s) => s.addItem);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const reorder = (items: any[]) => {
    items.forEach((item: any) => addItem({ id: item.id, name: item.name, price: item.price, unit: item.unit, image_url: null }));
    toast.success("Items added to cart!");
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">No Orders Yet</h1>
        <p className="text-muted-foreground mb-6">Start shopping to see your orders here!</p>
        <Link to="/products"><Button className="rounded-xl">Browse Products</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10">
      <h1 className="font-heading text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order: any) => {
          const currentStep = STATUS_STEPS.indexOf(order.status);
          return (
            <div key={order.id} className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status === "delivered" ? "default" : "secondary"} className="rounded-full">
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                  <span className="font-heading font-bold text-primary">₹{order.total}</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      i <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {STATUS_ICONS[step]}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="hidden sm:flex justify-between text-[10px] text-muted-foreground px-1">
                {STATUS_STEPS.map((s) => <span key={s}>{STATUS_LABELS[s]}</span>)}
              </div>

              {/* Items */}
              <div className="text-sm space-y-1">
                {(order.items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Reorder */}
              <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => reorder(order.items as any[])}>
                <RotateCcw className="h-3 w-3" /> Reorder
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
