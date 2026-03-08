import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/use-wishlist";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const Wishlist = () => {
  const { wishlistItems, isLoggedIn } = useWishlist();

  const { data: products, isLoading } = useQuery({
    queryKey: ["wishlist-products", wishlistItems],
    queryFn: async () => {
      if (wishlistItems.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", wishlistItems)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: wishlistItems.length > 0,
  });

  if (!isLoggedIn) {
    return (
      <div className="container py-20 text-center">
        <Heart className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">My Wishlist</h1>
        <p className="text-muted-foreground mb-6">Login to save your favourite products!</p>
        <Link to="/auth?redirect=/wishlist">
          <Button className="rounded-xl">Login / Sign Up</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="h-6 w-6 text-primary fill-primary" />
        <h1 className="font-heading text-2xl font-bold">My Wishlist</h1>
        {products && products.length > 0 && (
          <span className="text-sm text-muted-foreground">({products.length} items)</span>
        )}
      </div>

      {!products || products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <Heart className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium mb-1">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground mb-6">Tap the ❤️ on products to save them here</p>
          <Link to="/products">
            <Button className="rounded-xl gap-2">
              <ShoppingBag className="h-4 w-4" /> Browse Products
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              mrp={product.mrp}
              unit={product.unit}
              image_url={product.image_url}
              stock={product.stock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
