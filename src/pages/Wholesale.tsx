import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, BookOpen, LogOut, TrendingUp, TrendingDown, CreditCard, Search, Package, RotateCcw, Minus, Plus, Store } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CartDrawer from "@/components/cart/CartDrawer";

const BULK_PRESETS = [5, 10, 25, 50];

const Wholesale = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/wholesale-register"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.customer_type !== "wholesale") {
        if (prof?.wholesale_status === "pending") {
          toast.info("Your wholesale application is still under review");
        } else {
          toast.error("Access restricted to approved wholesale customers");
        }
        navigate("/wholesale-register");
        return;
      }
      setUser(user);
      setProfile(prof);
      setChecking(false);
    };
    check();
  }, [navigate]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => { const { data } = await supabase.from("categories").select("*").order("sort_order"); return data || []; },
    enabled: !checking,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["wholesale-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name, id)").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !checking,
  });

  const { data: ledger } = useQuery({
    queryKey: ["my-ledger"],
    queryFn: async () => {
      const { data } = await supabase.from("ledger").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", user!.id).eq("customer_type", "wholesale").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const currentBalance = ledger?.[0]?.balance ?? 0;

  const filteredProducts = products?.filter((p: any) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || p.category_id === activeCategory;
    return matchSearch && matchCat;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-secondary" />
            <span className="font-heading text-lg font-bold text-secondary">Wholesale Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {(profile as any)?.shop_name || profile?.name || "Wholesaler"}
            </span>
            <WholesaleCartButton />
            <CartDrawer checkoutPath="/wholesale-checkout" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-5 md:py-8">
        {/* Stats Row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className={`font-heading text-xl font-bold mt-1 ${currentBalance > 0 ? "text-destructive" : "text-secondary"}`}>
              ₹{Math.abs(currentBalance).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{currentBalance > 0 ? "Due" : currentBalance < 0 ? "Credit" : "Clear"}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders</p>
            <p className="font-heading text-xl font-bold mt-1">{orders?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total placed</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shop</p>
            <p className="font-heading text-sm font-bold mt-1 truncate">{(profile as any)?.shop_name || "—"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile?.village || "—"}</p>
          </div>
        </motion.div>

        <Tabs defaultValue="products">
          <TabsList className="mb-4">
            <TabsTrigger value="products" className="gap-1"><Package className="h-3.5 w-3.5" /> Products</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Orders</TabsTrigger>
            <TabsTrigger value="ledger" className="gap-1"><BookOpen className="h-3.5 w-3.5" /> Khata</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              <Button size="sm" variant={activeCategory === "all" ? "default" : "outline"} className="rounded-full text-xs shrink-0 h-8"
                onClick={() => setActiveCategory("all")}>All</Button>
              {categories?.map((cat: any) => (
                <Button key={cat.id} size="sm" variant={activeCategory === cat.id ? "default" : "outline"}
                  className="rounded-full text-xs shrink-0 h-8 gap-1" onClick={() => setActiveCategory(cat.id)}>
                  {cat.icon && <span>{cat.icon}</span>} {cat.name}
                </Button>
              ))}
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product: any) => (
                  <WholesaleProductRow key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="rounded-xl border bg-card overflow-hidden">
              {!orders?.length ? (
                <div className="py-16 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Place your first wholesale order</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => {
                      const items = Array.isArray(order.items) ? order.items : [];
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="text-sm">{format(new Date(order.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-sm">{items.length} items</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "delivered" ? "secondary" : order.status === "pending" ? "destructive" : "default"} className="rounded-full text-xs capitalize">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">₹{order.total}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                              onClick={() => {
                                items.forEach((item: any) => {
                                  useCartStore.getState().addItem({
                                    id: item.id, name: item.name, price: item.price,
                                    unit: item.unit, image_url: item.image_url,
                                  });
                                });
                                toast.success("Items added to cart!");
                              }}>
                              <RotateCcw className="h-3 w-3" /> Reorder
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Ledger Tab */}
          <TabsContent value="ledger">
            <div className="rounded-xl border bg-card overflow-hidden">
              {!ledger?.length ? (
                <div className="py-16 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p className="font-medium">No ledger entries yet</p>
                  <p className="text-sm mt-1">Your transaction history will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{format(new Date(entry.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={entry.type === "payment" ? "secondary" : entry.type === "credit" ? "default" : "destructive"} className="rounded-full gap-1 text-xs">
                            {entry.type === "credit" && <TrendingUp className="h-3 w-3" />}
                            {entry.type === "debit" && <TrendingDown className="h-3 w-3" />}
                            {entry.type === "payment" && <CreditCard className="h-3 w-3" />}
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.description || "—"}</TableCell>
                        <TableCell className={`text-right font-medium ${entry.type === "payment" ? "text-secondary" : entry.type === "debit" ? "text-destructive" : ""}`}>
                          {entry.type === "payment" ? "-" : "+"}₹{Math.abs(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{entry.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Wholesale product as a row card with bulk qty selector
const WholesaleProductRow = ({ product }: { product: any }) => {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === product.id));
  const wholesalePrice = product.wholesale_price || product.price;
  const savings = product.price > wholesalePrice ? Math.round(((product.price - wholesalePrice) / product.price) * 100) : 0;

  const addMultiple = (qty: number) => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url });
    }
    toast.success(`${qty}× ${product.name} added`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow">
      {/* Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-[10px] font-semibold text-destructive">Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium leading-tight truncate">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground">{product.unit} • {product.categories?.name || ""}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-heading text-base font-bold text-secondary">₹{wholesalePrice}</span>
          {savings > 0 && (
            <>
              <span className="text-xs text-muted-foreground line-through">₹{product.price}</span>
              <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0">{savings}% off</Badge>
            </>
          )}
        </div>

        {/* Bulk buttons & qty */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {itemInCart ? (
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(product.id)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-semibold w-8 text-center">{itemInCart.quantity}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url })}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="h-7 text-xs rounded-lg bg-secondary hover:bg-secondary/90" disabled={product.stock <= 0}
              onClick={() => addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url })}>
              + Add
            </Button>
          )}
          {BULK_PRESETS.map((qty) => (
            <Button key={qty} size="sm" variant="outline" className="h-7 text-[10px] rounded-lg px-2" disabled={product.stock <= 0}
              onClick={() => addMultiple(qty)}>
              +{qty}
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const WholesaleCartButton = () => {
  const totalItems = useCartStore((s) => s.totalItems());
  const toggleCart = useCartStore((s) => s.toggleCart);
  return (
    <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={toggleCart}>
      <ShoppingBag className="h-4 w-4" />
      {totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
          {totalItems}
        </span>
      )}
    </Button>
  );
};

export default Wholesale;
