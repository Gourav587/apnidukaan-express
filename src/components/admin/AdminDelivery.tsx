import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, CheckCircle, MapPin, IndianRupee } from "lucide-react";

export function AdminDelivery() {
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => { const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Updated"); },
  });

  const deliveryOrders = orders?.filter((o: any) => ["packed", "out_for_delivery"].includes(o.status)) || [];

  // Group by village
  const routes: Record<string, any[]> = {};
  deliveryOrders.forEach((o: any) => {
    const village = o.village || "Unknown";
    if (!routes[village]) routes[village] = [];
    routes[village].push(o);
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Delivery Routes</h1>
        <p className="text-sm text-muted-foreground">{deliveryOrders.length} orders ready for delivery</p>
      </div>

      {Object.keys(routes).length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-heading font-semibold">No deliveries pending</p>
          <p className="text-sm text-muted-foreground">Pack orders first to see them here</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(routes).map(([village, vilOrders]) => {
            const totalCash = vilOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
            return (
              <div key={village} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between bg-muted/50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-semibold">{village}</h3>
                    <Badge variant="secondary" className="rounded-full">{vilOrders.length} orders</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <IndianRupee className="h-3.5 w-3.5" />{totalCash}
                    <span className="text-xs text-muted-foreground font-normal ml-1">to collect</span>
                  </div>
                </div>
                <div className="divide-y">
                  {vilOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{o.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{o.phone} • ₹{o.total}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(o.items as any[])?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={o.status === "out_for_delivery" ? "default" : "secondary"} className="rounded-full capitalize text-xs">
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                        {o.status === "packed" && (
                          <Button size="sm" variant="outline" className="rounded-lg gap-1 h-7" onClick={() => updateStatus.mutate({ id: o.id, status: "out_for_delivery" })}>
                            <Truck className="h-3 w-3" /> Send
                          </Button>
                        )}
                        {o.status === "out_for_delivery" && (
                          <Button size="sm" className="rounded-lg gap-1 h-7" onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}>
                            <CheckCircle className="h-3 w-3" /> Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
