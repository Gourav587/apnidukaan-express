import { Link } from "react-router-dom";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const totalItems = useCartStore((s) => s.totalItems());
  const toggleCart = useCartStore((s) => s.toggleCart);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <span className="font-heading text-xl font-bold text-primary">
            ApniDukaan
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Products</Link>
          <Link to="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Orders</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleCart} className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {totalItems}
              </motion.span>
            )}
          </Button>
          <Link to="/auth">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t md:hidden"
          >
            <div className="container flex flex-col gap-2 py-4">
              <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">Home</Link>
              <Link to="/products" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">Products</Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">My Orders</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
