import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { motion } from "framer-motion";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  stock: number;
}

const ProductCard = ({ id, name, price, unit, image_url, stock }: ProductCardProps) => {
  const addItem = useCartStore((s) => s.addItem);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image_url ? (
          <img src={image_url} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🛍️</div>
        )}
        {stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">Out of Stock</span>
          </div>
        )}
        {stock > 0 && stock <= 10 && (
          <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
            Only {stock} left
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{unit}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-heading text-lg font-bold text-primary">₹{price}</span>
          <Button
            size="sm"
            className="h-8 rounded-lg"
            disabled={stock <= 0}
            onClick={() => addItem({ id, name, price, unit, image_url })}
          >
            {itemInCart ? <><Check className="h-3 w-3 mr-1" />{itemInCart.quantity}</> : <><Plus className="h-3 w-3 mr-1" />Add</>}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
