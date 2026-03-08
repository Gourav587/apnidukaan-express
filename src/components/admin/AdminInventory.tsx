import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, AlertTriangle } from "lucide-react";

export function AdminInventory() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => { const { data } = await supabase.from("products").select("*, categories(name)").order("stock", { ascending: true }); return data || []; },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("products").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Stock updated"); },
  });

  const saveAll = () => {
    Object.entries(edits).forEach(([id, stock]) => updateStock.mutate({ id, stock }));
    setEdits({});
  };

  const lowStock = products?.filter((p: any) => p.stock < 10) || [];
  const outOfStock = products?.filter((p: any) => p.stock <= 0) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{products?.length || 0} products tracked</p>
        </div>
        {Object.keys(edits).length > 0 && (
          <Button className="rounded-xl gap-1" onClick={saveAll}><Save className="h-4 w-4" /> Save Changes ({Object.keys(edits).length})</Button>
        )}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-destructive/5 p-4">
          <p className="text-2xl font-heading font-bold text-destructive">{outOfStock.length}</p>
          <p className="text-xs text-muted-foreground">Out of Stock</p>
        </div>
        <div className="rounded-xl border bg-orange-500/5 p-4">
          <p className="text-2xl font-heading font-bold text-orange-600">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Low Stock (&lt;10)</p>
        </div>
        <div className="rounded-xl border bg-secondary/5 p-4">
          <p className="text-2xl font-heading font-bold text-secondary">{(products?.length || 0) - lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Healthy Stock</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-heading font-bold">{products?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Products</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quick Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((p: any) => {
              const currentStock = edits[p.id] ?? p.stock;
              return (
                <TableRow key={p.id} className={p.stock < 10 ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(p as any).categories?.name || "—"}</TableCell>
                  <TableCell className="font-semibold">{p.stock}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${p.stock <= 0 ? "bg-destructive" : p.stock < 10 ? "bg-orange-500" : p.stock < 30 ? "bg-primary" : "bg-secondary"}`}
                          style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.stock <= 0 ? <Badge variant="destructive" className="rounded-full gap-1"><AlertTriangle className="h-3 w-3" /> Out</Badge>
                      : p.stock < 10 ? <Badge className="rounded-full bg-orange-500/10 text-orange-700 border-orange-200">Low</Badge>
                      : <Badge variant="secondary" className="rounded-full">OK</Badge>}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-20 rounded-lg text-sm"
                      value={currentStock}
                      onChange={(e) => setEdits({ ...edits, [p.id]: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
