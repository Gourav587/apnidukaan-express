import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, Heart } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useWishlist } from "@/hooks/use-wishlist";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  stock: number;
}

import { forwardRef } from "react";

const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(({ id, name, price, unit, image_url, stock }, ref) => {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === id));
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(id);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Wishlist heart */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(id); }}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all hover:scale-110"
      >
        <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
      </button>

      <Link to={`/products/${id}`} className="relative aspect-square overflow-hidden bg-muted block">
        {image_url ? (
          <img src={image_url} alt={name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🛍️</div>
        )}
        {stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">Out of Stock</span>
          </div>
        )}
        {stock > 0 && stock <= 10 && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
            Only {stock} left
          </span>
        )}
        {/* Quick add overlay on hover */}
        {stock > 0 && !itemInCart && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
            <Button
              className="w-full rounded-none h-9 gap-1 text-xs"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id, name, price, unit, image_url }); }}
            >
              <ShoppingCart className="h-3 w-3" /> Add to Cart
            </Button>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/products/${id}`}>
          <h3 className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors">{name}</h3>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{unit}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-heading text-lg font-bold text-primary">₹{price}</span>
          <AnimatePresence mode="wait">
            {itemInCart ? (
              <motion.div
                key="qty"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5"
              >
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(id, itemInCart.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{itemInCart.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => addItem({ id, name, price, unit, image_url })}>
                  <Plus className="h-3 w-3" />
                </Button>
              </motion.div>
            ) : (
              <motion.div key="add" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <Button size="sm" className="h-8 rounded-lg gap-1" disabled={stock <= 0} onClick={() => addItem({ id, name, price, unit, image_url })}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
