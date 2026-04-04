import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

const PRESET_VARIANTS = [
  { label: "250g", price: 0, stock: 0 },
  { label: "500g", price: 0, stock: 0 },
  { label: "1 kg", price: 0, stock: 0 },
];

export function AdminProductVariants({ productId, productName, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [newVariant, setNewVariant] = useState({ label: "", price: 0, mrp: 0, wholesale_price: 0, stock: 0, is_active: true, is_default: false });

  const { data: variants, isLoading } = useQuery({
    queryKey: ["admin-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (v: typeof newVariant) => {
      const sortOrder = (variants?.length || 0);
      const { error } = await supabase.from("product_variants").insert({
        product_id: productId,
        label: v.label,
        price: v.price,
        mrp: v.mrp || null,
        wholesale_price: v.wholesale_price || null,
        stock: v.stock,
        is_active: v.is_active,
        is_default: v.is_default,
        sort_order: sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] });
      setNewVariant({ label: "", price: 0, mrp: 0, wholesale_price: 0, stock: 0, is_active: true, is_default: false });
      toast.success("Variant added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] });
      toast.success("Variant deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("product_variants").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] }),
  });

  const addPresets = async () => {
    const existing = variants?.map((v) => v.label.toLowerCase()) || [];
    const toAdd = PRESET_VARIANTS.filter((p) => !existing.includes(p.label.toLowerCase()));
    if (toAdd.length === 0) { toast.info("Presets already exist"); return; }

    for (let i = 0; i < toAdd.length; i++) {
      await supabase.from("product_variants").insert({
        product_id: productId,
        label: toAdd[i].label,
        price: toAdd[i].price,
        stock: toAdd[i].stock,
        sort_order: (variants?.length || 0) + i,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] });
    toast.success(`Added ${toAdd.length} preset variants`);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Variants — {productName}</DialogTitle>
        </DialogHeader>

        <Button variant="outline" size="sm" className="rounded-lg gap-1 w-fit" onClick={addPresets}>
          <Plus className="h-3 w-3" /> Add 250g / 500g / 1kg Presets
        </Button>

        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {variants?.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-lg border p-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{v.label}</span>
                  <Badge variant="secondary" className="text-xs">₹{v.price}</Badge>
                  {v.mrp && <span className="text-xs text-muted-foreground line-through">₹{v.mrp}</span>}
                  <Badge variant={v.stock > 0 ? "outline" : "destructive"} className="text-xs">Stock: {v.stock}</Badge>
                  {v.is_default && <Badge className="text-xs">Default</Badge>}
                </div>
              </div>
              <Switch
                checked={v.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: v.id, is_active: checked })}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(v.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {variants?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No variants yet. Add presets or create custom ones.</p>}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <Label className="text-xs font-semibold">Add Custom Variant</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Label</Label>
              <Input className="h-8 text-sm rounded-md" placeholder="e.g. 2 kg" value={newVariant.label} onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Price (₹)</Label>
              <Input type="number" className="h-8 text-sm rounded-md" value={newVariant.price || ""} onChange={(e) => setNewVariant({ ...newVariant, price: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">MRP (₹)</Label>
              <Input type="number" className="h-8 text-sm rounded-md" value={newVariant.mrp || ""} onChange={(e) => setNewVariant({ ...newVariant, mrp: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Stock</Label>
              <Input type="number" className="h-8 text-sm rounded-md" value={newVariant.stock || ""} onChange={(e) => setNewVariant({ ...newVariant, stock: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Wholesale (₹)</Label>
              <Input type="number" className="h-8 text-sm rounded-md" value={newVariant.wholesale_price || ""} onChange={(e) => setNewVariant({ ...newVariant, wholesale_price: +e.target.value })} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <div className="flex items-center gap-1">
                <Switch checked={newVariant.is_default} onCheckedChange={(v) => setNewVariant({ ...newVariant, is_default: v })} />
                <Label className="text-[10px]">Default</Label>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-lg w-full"
            disabled={!newVariant.label || newVariant.price <= 0}
            onClick={() => addMutation.mutate(newVariant)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Variant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
