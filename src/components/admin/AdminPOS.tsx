import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import { format } from "date-fns";

export function AdminPOS() {
  // POS orders are orders placed directly (no user_id or via admin)
  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => { const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const posOrders = orders?.filter((o: any) => !o.user_id) || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">POS Billing Records</h1>
        <p className="text-sm text-muted-foreground">{posOrders.length} in-store bills</p>
      </div>

      {posOrders.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-heading font-semibold">No POS records yet</p>
          <p className="text-sm text-muted-foreground">In-store bills will appear here</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posOrders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {(o.items as any[])?.map((i: any) => `${i.name} × ${i.quantity}`).join(", ")}
                  </TableCell>
                  <TableCell className="font-semibold">₹{o.total}</TableCell>
                  <TableCell><Badge variant="secondary" className="rounded-full text-xs">Cash</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
