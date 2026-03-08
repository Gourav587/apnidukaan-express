import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Plus, Pencil, Trash2, LogOut, BookOpen, Users, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const STATUS_OPTIONS = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];

// Product form component
const ProductForm = ({ product, categories, onSave, onClose }: any) => {
  const [form, setForm] = useState(product || { name: "", price: 0, wholesale_price: 0, stock: 0, unit: "1 kg", category_id: "", image_url: "", is_active: true, description: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, price: Number(form.price), wholesale_price: Number(form.wholesale_price), stock: Number(form.stock) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Name</Label><Input className="rounded-xl mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Price (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
        <div><Label>Wholesale (₹)</Label><Input type="number" className="rounded-xl mt-1" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} /></div>
        <div><Label>Stock</Label><Input type="number" className="rounded-xl mt-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Unit</Label><Input className="rounded-xl mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
        <div>
          <Label>Category</Label>
          <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
            <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Image URL</Label><Input className="rounded-xl mt-1" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
      <Button type="submit" className="w-full rounded-xl">{product ? "Update" : "Add"} Product</Button>
    </form>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { toast.error("Access denied"); navigate("/"); return; }
      setIsAdmin(true);
    };
    checkAdmin();
  }, [navigate]);

  // Fetch data
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: async () => { const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }); return data || []; }, enabled: isAdmin === true });
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: async () => { const { data } = await supabase.from("products").select("*, categories(name)").order("name"); return data || []; }, enabled: isAdmin === true });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: async () => { const { data } = await supabase.from("categories").select("*").order("sort_order"); return data || []; }, enabled: isAdmin === true });

  // Mutations
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Order updated"); },
  });

  const saveProduct = useMutation({
    mutationFn: async (product: any) => {
      if (product.id) {
        const { error } = await supabase.from("products").update(product).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(product);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); setProductDialogOpen(false); setEditingProduct(null); toast.success("Product saved"); },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Product deleted"); },
  });

  if (isAdmin === null) return <div className="container py-20 text-center"><p>Checking access...</p></div>;

  const todayOrders = orders?.filter((o: any) => new Date(o.created_at).toDateString() === new Date().toDateString()) || [];
  const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const lowStockProducts = products?.filter((p: any) => p.stock < 10) || [];

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        {[
          { icon: ShoppingCart, label: "Orders Today", value: todayOrders.length, color: "text-primary" },
          { icon: TrendingUp, label: "Revenue Today", value: `₹${todayRevenue}`, color: "text-secondary" },
          { icon: Package, label: "Pending", value: pendingOrders.length, color: "text-primary" },
          { icon: AlertTriangle, label: "Low Stock", value: lowStockProducts.length, color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="font-heading text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{order.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.phone || "—"}</p>
                    </TableCell>
                    <TableCell className="font-semibold">₹{order.total}</TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(v) => updateOrderStatus.mutate({ id: order.id, status: v })}>
                        <SelectTrigger className="h-8 w-40 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM, hh:mm a")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="mb-4">
            <Dialog open={productDialogOpen} onOpenChange={(v) => { setProductDialogOpen(v); if (!v) setEditingProduct(null); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingProduct ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
                <ProductForm product={editingProduct} categories={categories} onSave={(p: any) => saveProduct.mutate(p)} onClose={() => setProductDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((p: any) => (
                  <TableRow key={p.id} className={p.stock < 10 ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.categories?.name || "—"}</TableCell>
                    <TableCell className="text-sm">₹{p.price}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock < 10 ? "destructive" : "secondary"} className="rounded-full">{p.stock}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingProduct(p); setProductDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProduct.mutate(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.sort((a: any, b: any) => a.stock - b.stock).map((p: any) => (
                  <TableRow key={p.id} className={p.stock < 10 ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.stock < 10 ? "bg-destructive" : p.stock < 30 ? "bg-primary" : "bg-secondary"}`}
                            style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm">{p.stock}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.stock <= 0 ? <Badge variant="destructive" className="rounded-full">Out of Stock</Badge>
                        : p.stock < 10 ? <Badge variant="destructive" className="rounded-full">Low Stock</Badge>
                        : <Badge variant="secondary" className="rounded-full">In Stock</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
