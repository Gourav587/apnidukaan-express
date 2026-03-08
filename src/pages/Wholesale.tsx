import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, BookOpen, LogOut, TrendingUp, TrendingDown, CreditCard, Search, Package, RotateCcw, Minus, Plus, Store, User, FileText, BarChart3, Truck, CheckCircle, Clock, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import { toast } from "sonner";
import CartDrawer from "@/components/cart/CartDrawer";

const BULK_PRESETS = [5, 10, 25, 50];

// Calculate bulk discount based on quantity
const calculateBulkDiscount = (qty: number, tiers: any[]): number => {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => b.qty - a.qty);
  for (const tier of sorted) {
    if (qty >= tier.qty) return tier.discount_percent || 0;
  }
  return 0;
};

const Wholesale = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", shop_name: "", gst_number: "", village: "", address: "" });

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
      setProfileForm({
        name: prof.name || "",
        phone: prof.phone || "",
        shop_name: (prof as any).shop_name || "",
        gst_number: (prof as any).gst_number || "",
        village: prof.village || "",
        address: prof.address || "",
      });
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

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("profiles").update(data).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setProfile({ ...profile, ...profileForm });
      setProfileOpen(false);
      toast.success("Profile updated!");
    },
  });

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const currentBalance = ledger?.[0]?.balance ?? 0;
  const payments = ledger?.filter((e: any) => e.type === "payment") || [];
  const totalSpent = orders?.reduce((sum: number, o: any) => sum + o.total, 0) || 0;
  const thisMonthOrders = orders?.filter((o: any) => new Date(o.created_at).getMonth() === new Date().getMonth()).length || 0;

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
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setProfileOpen(true)}>
              <User className="h-3.5 w-3.5" /> Profile
            </Button>
            <WholesaleCartButton />
            <CartDrawer checkoutPath="/wholesale-checkout" isWholesale />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-5 md:py-8">
        {/* Stats Row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className={`font-heading text-xl font-bold mt-1 ${currentBalance > 0 ? "text-destructive" : "text-secondary"}`}>
              ₹{Math.abs(currentBalance).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{currentBalance > 0 ? "Due" : currentBalance < 0 ? "Credit" : "Clear"}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Spent</p>
            <p className="font-heading text-xl font-bold mt-1 text-secondary">₹{totalSpent.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{orders?.length || 0} orders</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This Month</p>
            <p className="font-heading text-xl font-bold mt-1">{thisMonthOrders}</p>
            <p className="text-[10px] text-muted-foreground">orders placed</p>
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
            <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
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

          {/* Orders Tab with Delivery Tracking */}
          <TabsContent value="orders">
            <div className="space-y-3">
              {!orders?.length ? (
                <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Place your first wholesale order</p>
                </div>
              ) : (
                orders.map((order: any) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </TabsContent>

          {/* Ledger Tab */}
          <TabsContent value="ledger">
            <div className="space-y-4">
              {/* Payment History Summary */}
              {payments.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {payments.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy")}</span>
                        <span className="text-secondary font-medium">-₹{p.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Orders</span><span className="font-semibold">{orders?.length || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Spent</span><span className="font-semibold text-secondary">₹{totalSpent.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Order Value</span><span className="font-semibold">₹{orders?.length ? Math.round(totalSpent / orders.length).toLocaleString() : 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">This Month</span><span className="font-semibold">{thisMonthOrders} orders</span></div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-4 w-4" /> Top Products</h3>
                {orders?.length ? (
                  <div className="space-y-2">
                    {getTopProducts(orders).slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                        <span className="font-medium ml-2">{p.qty} units</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No order data yet</p>
                )}
              </div>

              <div className="rounded-xl border bg-card p-5 md:col-span-2">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-destructive">₹{Math.max(0, currentBalance).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-secondary">₹{payments.reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{payments.length}</p>
                    <p className="text-xs text-muted-foreground">Payments Made</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Shop Profile</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(profileForm); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Owner Name</Label><Input className="rounded-xl mt-1" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></div>
              <div><Label className="text-xs">Phone</Label><Input className="rounded-xl mt-1" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Shop Name</Label><Input className="rounded-xl mt-1" value={profileForm.shop_name} onChange={(e) => setProfileForm({ ...profileForm, shop_name: e.target.value })} /></div>
            <div><Label className="text-xs">GST Number</Label><Input className="rounded-xl mt-1" value={profileForm.gst_number} onChange={(e) => setProfileForm({ ...profileForm, gst_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Village/Town</Label><Input className="rounded-xl mt-1" value={profileForm.village} onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })} /></div>
              <div><Label className="text-xs">Address</Label><Input className="rounded-xl mt-1" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full rounded-xl bg-secondary hover:bg-secondary/90">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Order Card with Delivery Tracking
const OrderCard = ({ order }: { order: any }) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const statusSteps = ["pending", "confirmed", "packed", "shipped", "delivered"];
  const currentStep = statusSteps.indexOf(order.status);

  const generateInvoice = () => {
    const invoiceContent = `
WHOLESALE INVOICE
=====================================
Order #${order.id.slice(0, 8).toUpperCase()}
Date: ${format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
-------------------------------------
Customer: ${order.customer_name || "—"}
Phone: ${order.phone || "—"}
Address: ${order.address || "—"}, ${order.village || ""}
-------------------------------------
ITEMS:
${items.map((i: any) => `${i.name} x${i.quantity} @ ₹${i.price} = ₹${i.price * i.quantity}`).join("\n")}
-------------------------------------
TOTAL: ₹${order.total}
Payment: ${order.payment_method?.toUpperCase() || "CREDIT"}
=====================================
Thank you for your business!
    `.trim();

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={generateInvoice}>
            <FileText className="h-3 w-3" /> Invoice
          </Button>
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
        </div>
      </div>

      {/* Delivery Timeline */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          {statusSteps.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= currentStep ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < currentStep ? <CheckCircle className="h-3.5 w-3.5" /> : 
                 i === currentStep ? (step === "delivered" ? <PackageCheck className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />) : 
                 <span>{i + 1}</span>}
              </div>
              <span className={`text-[9px] mt-1 capitalize ${i <= currentStep ? "text-secondary font-medium" : "text-muted-foreground"}`}>{step}</span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-secondary transition-all" style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Items Summary */}
      <div className="text-sm space-y-1 border-t pt-3">
        {items.slice(0, 3).map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-muted-foreground">
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>}
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>Total</span>
          <span className="text-secondary">₹{order.total}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Helper to get top products from orders
const getTopProducts = (orders: any[]) => {
  const productMap: Record<string, { name: string; qty: number }> = {};
  orders.forEach((o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      if (productMap[item.id]) {
        productMap[item.id].qty += item.quantity;
      } else {
        productMap[item.id] = { name: item.name, qty: item.quantity };
      }
    });
  });
  return Object.values(productMap).sort((a, b) => b.qty - a.qty);
};

// Wholesale product as a row card with bulk qty selector + bulk discounts + stock validation
const WholesaleProductRow = ({ product }: { product: any }) => {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === product.id));
  const wholesalePrice = product.wholesale_price || product.price;
  const savings = product.price > wholesalePrice ? Math.round(((product.price - wholesalePrice) / product.price) * 100) : 0;
  const minQty = product.min_wholesale_qty || 1;
  const maxQty = product.max_wholesale_qty || null;
  const currentQty = itemInCart?.quantity || 0;
  const belowMin = currentQty > 0 && currentQty < minQty;
  const stock = product.stock || 0;
  const isOutOfStock = stock <= 0;
  const effectiveMax = maxQty ? Math.min(stock, maxQty) : stock;
  const remainingStock = Math.max(0, effectiveMax - currentQty);
  const atMaxStock = currentQty >= effectiveMax;

  // Bulk discount calculation
  const bulkTiers = product.bulk_discount_tiers || [];
  const bulkDiscount = calculateBulkDiscount(currentQty, bulkTiers);
  const discountedPrice = bulkDiscount > 0 ? wholesalePrice * (1 - bulkDiscount / 100) : wholesalePrice;

  const addMultiple = (qty: number) => {
    const canAdd = Math.min(qty, remainingStock);
    if (canAdd <= 0) {
      toast.error(`Only ${stock} available in stock`);
      return;
    }
    for (let i = 0; i < canAdd; i++) {
      addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url });
    }
    if (canAdd < qty) {
      toast.info(`Added ${canAdd} (max available stock)`);
    } else {
      toast.success(`${canAdd}× ${product.name} added`);
    }
  };

  const addMinQty = () => {
    const canAdd = Math.min(minQty, stock);
    if (canAdd <= 0) {
      toast.error("Out of stock");
      return;
    }
    for (let i = 0; i < canAdd; i++) {
      addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url });
    }
    if (canAdd < minQty) {
      toast.info(`Added ${canAdd} (only ${stock} in stock)`);
    } else {
      toast.success(`${minQty}× ${product.name} added (minimum order)`);
    }
  };

  const handleAddOne = () => {
    if (atMaxStock) {
      toast.error(`Only ${stock} available in stock`);
      return;
    }
    addItem({ id: product.id, name: product.name, price: wholesalePrice, unit: product.unit, image_url: product.image_url });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow ${belowMin ? "border-destructive/50" : ""} ${isOutOfStock ? "opacity-60" : ""}`}>
      {/* Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
            <span className="text-[10px] font-bold text-destructive px-2 py-1 bg-destructive/10 rounded">OUT OF STOCK</span>
          </div>
        )}
        {!isOutOfStock && bulkTiers.length > 0 && (
          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded">BULK</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium leading-tight truncate">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground">
          {product.unit} • {product.categories?.name || ""}
          {minQty > 1 && <span className="text-secondary font-medium"> • Min: {minQty}</span>}
          {!isOutOfStock && <span className={`ml-1 ${stock <= 10 ? "text-destructive" : "text-muted-foreground"}`}>• Stock: {stock}</span>}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="font-heading text-base font-bold text-secondary">₹{Math.round(discountedPrice)}</span>
          {bulkDiscount > 0 && (
            <Badge variant="default" className="rounded-full text-[10px] px-1.5 py-0 bg-primary">{bulkDiscount}% bulk off</Badge>
          )}
          {savings > 0 && bulkDiscount === 0 && (
            <>
              <span className="text-xs text-muted-foreground line-through">₹{product.price}</span>
              <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0">{savings}% off</Badge>
            </>
          )}
        </div>

        {/* Bulk tier hints */}
        {bulkTiers.length > 0 && currentQty > 0 && (
          <p className="text-[10px] text-primary mt-0.5">
            {bulkTiers.sort((a: any, b: any) => a.qty - b.qty).map((t: any) => `${t.qty}+ = ${t.discount_percent}%`).join(" | ")}
          </p>
        )}

        {/* Limit warning */}
        {!isOutOfStock && atMaxStock && (
          <p className="text-[10px] text-destructive mt-1">
            ⚠️ {maxQty && currentQty >= maxQty ? `Max ${maxQty} per order` : `Max stock reached (${stock} available)`}
          </p>
        )}

        {/* MOQ warning */}
        {belowMin && !atMaxStock && (
          <p className="text-[10px] text-destructive mt-1">⚠️ Add {Math.min(minQty - currentQty, remainingStock)} more to meet minimum</p>
        )}

        {/* Bulk buttons & qty */}
        {!isOutOfStock && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {itemInCart ? (
              <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(product.id)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className={`text-sm font-semibold w-8 text-center ${belowMin ? "text-destructive" : ""}`}>{itemInCart.quantity}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={atMaxStock} onClick={handleAddOne}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : minQty > 1 ? (
              <Button size="sm" className="h-7 text-xs rounded-lg bg-secondary hover:bg-secondary/90"
                onClick={addMinQty}>
                + Add {Math.min(minQty, stock)}
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs rounded-lg bg-secondary hover:bg-secondary/90"
                onClick={handleAddOne}>
                + Add
              </Button>
            )}
            {BULK_PRESETS.filter(q => q >= minQty && q <= stock).map((qty) => (
              <Button key={qty} size="sm" variant="outline" className="h-7 text-[10px] rounded-lg px-2"
                disabled={remainingStock < qty}
                onClick={() => addMultiple(qty)}>
                +{qty}
              </Button>
            ))}
          </div>
        )}
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
