import { Home, Search, ShoppingCart, Package, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCartStore } from "@/lib/cart-store";
import { motion } from "framer-motion";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/products", icon: Search, label: "Products" },
  { to: "__cart__", icon: ShoppingCart, label: "Cart" },
  { to: "/orders", icon: Package, label: "Orders" },
  { to: "/auth", icon: User, label: "Account" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const totalItems = useCartStore((s) => s.totalItems());
  const toggleCart = useCartStore((s) => s.toggleCart);

  // Hide on admin pages and checkout
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur-lg md:hidden safe-area-bottom">
      <div className="grid grid-cols-5 h-14">
        {tabs.map((tab) => {
          const isCart = tab.to === "__cart__";
          const isActive = !isCart && (
            tab.to === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(tab.to)
          );

          if (isCart) {
            return (
              <button
                key={tab.label}
                onClick={toggleCart}
                className="flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 -mt-5">
                  <tab.icon className="h-5 w-5" />
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-primary">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative active:scale-95 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
