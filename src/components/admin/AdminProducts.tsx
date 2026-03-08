import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const ProductForm = ({ product, categories, onSave }: any) => {
  const [form, setForm] = useState(product || {
    name: "", price: 0, mrp: 0, wholesale_price: 0, stock: 0, unit: "1 kg",
    category_id: "", image_url: "", is_active: true, description: "", min_wholesale_qty: 1,
    bulk_discount_tiers: [],
  });
  const [bulkTier, setBulkTier] = useState({ qty: "", discount: "" });

  const addBulkTier = () => {
    if (!bulkTier.qty || !bulkTier.discount) return;
    const tiers = [...(form.bulk_discount_tiers || []), { qty: Number(bulkTier.qty), discount_percent: Number(bulkTier.discount) }];
    setForm({ ...form, bulk_discount_tiers: tiers });
    setBulkTier({ qty: "", discount: "" });
  };

  const removeBulkTier = (index: number) => {
    const tiers = form.bulk_discount_tiers.filter((_: any, i: number) => i !== index);
    setForm({ ...form, bulk_discount_tiers: tiers });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, price: Number(form.price), mrp: Number(form.mrp) || null, wholesale_price: Number(form.wholesale_price), stock: Number(form.stock), min_wholesale_qty: Number(form.min_wholesale_qty) || 1 }); }} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div><Label>Product Name</Label><Input className="rounded-xl mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div><Label>Description</Label><Textarea className="rounded-xl mt-1" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>MRP (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.mrp || ""} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="Original price" /></div>
        <div><Label>Selling Price (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Wholesale (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.wholesale_price || ""} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} /></div>
        <div><Label>Stock</Label><Input type="number" className="rounded-xl mt-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
        <div><Label>Min Wholesale Qty</Label><Input type="number" min="1" className="rounded-xl mt-1" value={form.min_wholesale_qty || 1} onChange={(e) => setForm({ ...form, min_wholesale_qty: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Unit</Label><Input className="rounded-xl mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
        <div>
          <Label>Category</Label>
          <Select value={form.category_id || ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
            <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Min Wholesale Qty</Label><Input type="number" min="1" className="rounded-xl mt-1" value={form.min_wholesale_qty || 1} onChange={(e) => setForm({ ...form, min_wholesale_qty: e.target.value })} /></div>
      </div>
      
      {/* Bulk Discount Tiers */}
      <div className="rounded-lg border p-3 space-y-2">
        <Label className="text-xs font-semibold">Bulk Discount Tiers</Label>
        {form.bulk_discount_tiers?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.bulk_discount_tiers.map((tier: any, i: number) => (
              <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeBulkTier(i)}>
                {tier.qty}+ = {tier.discount_percent}% ✕
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label className="text-[10px]">Qty ≥</Label><Input type="number" className="rounded-xl mt-1 h-8" placeholder="50" value={bulkTier.qty} onChange={(e) => setBulkTier({ ...bulkTier, qty: e.target.value })} /></div>
          <div className="flex-1"><Label className="text-[10px]">Discount %</Label><Input type="number" className="rounded-xl mt-1 h-8" placeholder="5" value={bulkTier.discount} onChange={(e) => setBulkTier({ ...bulkTier, discount: e.target.value })} /></div>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={addBulkTier}>Add</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">e.g. Buy 50+ get 5% off, 100+ get 10% off</p>
      </div>

      <div><Label>Image URL</Label><Input className="rounded-xl mt-1" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        <Label>Active</Label>
      </div>
      <Button type="submit" className="w-full rounded-xl">{product?.id ? "Update" : "Add"} Product</Button>
    </form>
  );
};

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => { const { data } = await supabase.from("products").select("*, categories(name)").order("name"); return data || []; },
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => { const { data } = await supabase.from("categories").select("*").order("sort_order"); return data || []; },
  });

  const saveMutation = useMutation({
    mutationFn: async (p: any) => {
      const payload = { ...p }; delete payload.categories;
      if (p.id) { const { error } = await supabase.from("products").update(payload).eq("id", p.id); if (error) throw error; }
      else { const { error } = await supabase.from("products").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); setDialogOpen(false); setEditing(null); toast.success("Saved!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Deleted"); },
  });

  const filtered = products?.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
            <ProductForm product={editing} categories={categories} onSave={(p: any) => saveMutation.mutate(p)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Wholesale</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id} className={p.stock < 10 ? "bg-destructive/5" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-muted" />}
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.unit}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{(p as any).categories?.name || "—"}</TableCell>
                <TableCell className="font-medium">₹{p.price}</TableCell>
                <TableCell className="text-sm text-muted-foreground">₹{p.wholesale_price || "—"}</TableCell>
                <TableCell><Badge variant={p.stock < 10 ? "destructive" : "secondary"} className="rounded-full">{p.stock}</Badge></TableCell>
                <TableCell><Badge variant={p.is_active ? "default" : "secondary"} className="rounded-full">{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
