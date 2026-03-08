import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { ArrowLeft, Minus, Plus, ShoppingCart, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/products/ProductCard";
import ProductReviews from "@/components/products/ProductReviews";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const itemInCart = useCartStore((s) => s.items.find((i) => i.id === id));

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category_id", product!.category_id!)
        .neq("id", id!)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  if (isLoading) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">This product may have been removed.</p>
        <Link to="/products"><Button className="rounded-xl">Browse Products</Button></Link>
      </div>
    );
  }

  const handleAdd = () => addItem({ id: product.id, name: product.name, price: product.price, unit: product.unit, image_url: product.image_url });

  return (
    <div className="container py-6 md:py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/products" className="flex items-center gap-1 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Products
        </Link>
        <span>/</span>
        {product.categories?.name && (
          <>
            <Link to={`/products?category=${product.categories.name}`} className="hover:text-primary transition-colors">
              {product.categories.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      {/* Product Detail */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square overflow-hidden rounded-2xl border bg-muted"
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">🛍️</div>
          )}
          {product.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <span className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Out of Stock</span>
            </div>
          )}
          {product.stock > 0 && product.stock <= 10 && (
            <span className="absolute right-3 top-3 rounded-full bg-destructive/90 px-3 py-1 text-xs font-medium text-destructive-foreground">
              Only {product.stock} left
            </span>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          {product.categories?.name && (
            <Link
              to={`/products?category=${product.categories.name}`}
              className="mb-2 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
            >
              {product.categories.name}
            </Link>
          )}
          <h1 className="font-heading text-2xl font-bold md:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.unit}</p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-primary">₹{product.price}</span>
            {product.wholesale_price && product.wholesale_price < product.price && (
              <span className="text-sm text-muted-foreground">
                Wholesale: ₹{product.wholesale_price}
              </span>
            )}
          </div>

          {product.stock > 0 && (
            <p className="mt-2 text-sm text-secondary font-medium">✓ In Stock ({product.stock} available)</p>
          )}

          {/* Description */}
          <div className="mt-6 rounded-xl bg-muted/50 p-4">
            <h3 className="font-heading text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description || `High quality ${product.name}. Fresh stock available at the best price. Order now and get it delivered in 30 minutes!`}
            </p>
          </div>

          {/* Add to Cart */}
          <div className="mt-6 flex items-center gap-3">
            {itemInCart ? (
              <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-1">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => updateQuantity(product.id, itemInCart.quantity - 1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-lg font-semibold">{itemInCart.quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={handleAdd}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="lg" className="rounded-xl gap-2 flex-1 max-w-xs shadow-lg shadow-primary/20" disabled={product.stock <= 0} onClick={handleAdd}>
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </Button>
            )}
            {itemInCart && (
              <p className="text-sm text-muted-foreground">
                ₹{product.price * itemInCart.quantity} total
              </p>
            )}
          </div>

          {/* Delivery info */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>🚚 Free delivery on orders above ₹500</p>
            <p>⏱️ 30-minute delivery in Dinanagar area</p>
            <p>💵 Cash on Delivery available</p>
          </div>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <ProductReviews productId={product.id} />
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl font-bold mb-4">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((p: any) => (
              <ProductCard key={p.id} id={p.id} name={p.name} price={p.price} unit={p.unit} image_url={p.image_url} stock={p.stock} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
