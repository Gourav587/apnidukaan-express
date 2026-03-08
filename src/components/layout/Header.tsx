import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, LogOut, Heart, UserPen, Package } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Header = () => {
  const totalItems = useCartStore((s) => s.totalItems());
  const toggleCart = useCartStore((s) => s.toggleCart);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", phone: "", address: "", village: "" });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, phone, address, village")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfileData({
      name: data?.name || user.user_metadata?.name || "",
      phone: data?.phone || user.user_metadata?.phone || "",
      address: data?.address || "",
      village: data?.village || "",
    });
  };

  const handleOpenProfile = async () => {
    await loadProfile();
    setProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("profiles").update({ ...profileData, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    } else {
      await supabase.from("profiles").insert({ user_id: user.id, ...profileData });
    }
    await supabase.auth.updateUser({ data: { name: profileData.name, phone: profileData.phone } });
    setSaving(false);
    setProfileOpen(false);
    toast.success("Profile updated!");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out!");
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-2 sm:h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="font-heading text-lg font-bold text-primary sm:text-xl">ApniDukaan</span>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex relative flex-1 max-w-md mx-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search atta, oil, sugar..."
              className="pl-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Products</Link>
            <Link to="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Orders</Link>
          </nav>

          <div className="flex items-center gap-1">
            {/* Mobile Search Toggle */}
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>

            <ThemeToggle />

            <Link to="/wishlist" className="hidden md:block">
              <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
            </Link>

            <Button variant="ghost" size="icon" onClick={toggleCart} className="relative hidden md:flex">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </motion.span>
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(user.user_metadata?.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium">{user.user_metadata?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenProfile} className="cursor-pointer">
                    <UserPen className="mr-2 h-4 w-4" /> Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders")} className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" /> My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wishlist")} className="cursor-pointer">
                    <Heart className="mr-2 h-4 w-4" /> Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth" className="hidden md:block">
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t md:hidden"
            >
              <form onSubmit={handleSearch} className="container py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search products..." className="pl-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPen className="h-5 w-5 text-primary" /> Edit Profile
            </DialogTitle>
            <DialogDescription>Update your personal details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input id="profile-name" placeholder="Your name" value={profileData.name} onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input id="profile-phone" placeholder="10 digit number" value={profileData.phone} onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-address">Address</Label>
              <Input id="profile-address" placeholder="Your delivery address" value={profileData.address} onChange={(e) => setProfileData((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-village">Village / Area</Label>
              <Input id="profile-village" placeholder="e.g. Dinanagar" value={profileData.village} onChange={(e) => setProfileData((p) => ({ ...p, village: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
