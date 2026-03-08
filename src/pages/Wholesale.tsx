import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, BookOpen, LogOut, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import ProductCard from "@/components/products/ProductCard";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import CartDrawer from "@/components/cart/CartDrawer";

const Wholesale = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth?redirect=/wholesale"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.customer_type !== "wholesale") {
        toast.error("Access restricted to wholesale customers");
        navigate("/");
        return;
      }
      setUser(user);
      setProfile(prof);
      setChecking(false);
    };
    check();
  }, [navigate]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["wholesale-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !checking,
  });

  const { data: ledger } = useQuery({
    queryKey: ["my-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentBalance = ledger?.[0]?.balance ?? 0;

  const filteredProducts = products?.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <span className="font-heading text-lg font-bold text-primary">Wholesale Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, {profile?.name || "Wholesaler"}</span>
            <WholesaleCartButton />
            <CartDrawer checkoutPath="/wholesale-checkout" />
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 md:py-10">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="rounded-xl border bg-gradient-to-r from-secondary/10 to-primary/10 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`font-heading text-3xl font-bold ${currentBalance > 0 ? "text-destructive" : "text-secondary"}`}>
                  ₹{Math.abs(currentBalance).toLocaleString()}
                  {currentBalance > 0 && <span className="text-sm font-normal ml-2">(Due)</span>}
                  {currentBalance < 0 && <span className="text-sm font-normal ml-2">(Credit)</span>}
                  {currentBalance === 0 && <span className="text-sm font-normal ml-2">(Clear)</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-lg bg-card border p-3 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-heading font-bold text-lg">{orders?.length || 0}</p>
                </div>
                <div className="rounded-lg bg-card border p-3 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Entries</p>
                  <p className="font-heading font-bold text-lg">{ledger?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="products">
          <TabsList className="mb-4">
            <TabsTrigger value="products" className="gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Products</TabsTrigger>
            <TabsTrigger value="ledger" className="gap-1"><BookOpen className="h-3.5 w-3.5" /> Ledger</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search wholesale products..."
                className="pl-10 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {filteredProducts.map((product: any) => (
                  <WholesaleProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
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
                          <Badge
                            variant={entry.type === "payment" ? "secondary" : entry.type === "credit" ? "default" : "destructive"}
                            className="rounded-full gap-1 text-xs"
                          >
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
// Cart button for wholesale header
const WholesaleCartButton = () => {
  const totalItems = useCartStore((s) => s.totalItems());
  const toggleCart = useCartStore((s) => s.toggleCart);
  return (
    <Button variant="ghost" size="icon" className="relative" onClick={toggleCart}>
      <ShoppingBag className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {totalItems}
        </span>
      )}
    </Button>
  );
};

// Wholesale product card shows wholesale price
const WholesaleProductCard = ({ product }: { product: any }) => {
  const addItem = useCartStore((s) => s.addItem);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === product.id));
  const wholesalePrice = product.wholesale_price || product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🛍️</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
          Wholesale
        </span>
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{product.unit}</p>
        <div className="mt-auto pt-2">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold text-secondary">₹{wholesalePrice}</span>
            {wholesalePrice < product.price && (
              <span className="text-xs text-muted-foreground line-through">₹{product.price}</span>
            )}
          </div>
          <Button
            size="sm"
            className="mt-2 h-8 w-full rounded-lg bg-secondary hover:bg-secondary/90"
            disabled={product.stock <= 0}
            onClick={() => addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url })}
          >
            {itemInCart ? `✓ ${itemInCart.quantity} in cart` : "+ Add"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Wholesale;
