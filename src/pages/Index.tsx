import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Truck, Clock, Package, Wheat, Droplets, Flame, Star, ArrowRight, Sparkles, Shield, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/products/ProductCard";
import ProductSkeleton from "@/components/products/ProductSkeleton";

const categories = [
  { name: "Grains", icon: Wheat, emoji: "🌾" },
  { name: "Oil & Ghee", icon: Droplets, emoji: "🫗" },
  { name: "Spices", icon: Flame, emoji: "🌶️" },
  { name: "Daily Use", icon: Star, emoji: "🧹" },
];

const stats = [
  { icon: Package, label: "500+ Products", desc: "Wide grocery selection" },
  { icon: Clock, label: "30 Min Delivery", desc: "Fastest in Dinanagar" },
  { icon: Truck, label: "Free Above ₹500", desc: "Save on delivery" },
  { icon: Shield, label: "100% Genuine", desc: "Quality guaranteed" },
];

const offers = [
  { title: "First Order Offer", desc: "Free delivery on your first order!", tag: "NEW", color: "from-primary to-primary/70" },
  { title: "Bulk Savings", desc: "Buy 5kg+ atta and save ₹50!", tag: "SAVE", color: "from-secondary to-secondary/70" },
];

const testimonials = [
  { name: "Rajinder Singh", village: "Dinanagar", text: "Bohut vadiya service hai! Ghar baithe sab mil janda hai. 👍", rating: 5 },
  { name: "Sunita Devi", village: "Awankha", text: "Fast delivery and fresh products. Best kirana store!", rating: 5 },
  { name: "Amit Kumar", village: "Taragarh", text: "Prices are good, delivery is always on time. Highly recommended!", rating: 4 },
];

const Index = () => {
  const { data: popularProducts, isLoading } = useQuery({
    queryKey: ["popular-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-xs sm:text-sm font-medium">
        <Sparkles className="inline h-3 w-3 mr-1" />
        Free delivery on orders above ₹500! Order now 🎉
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              🏪 Dinanagar, Punjab
            </span>
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Dinanagar ka Apna{" "}
              <span className="text-primary">Online Kirana</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              Ghar baithe order karo, 30 minute mein delivery 🚀
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/products">
                <Button size="lg" className="rounded-xl gap-2 text-base px-8 shadow-lg shadow-primary/20">
                  <ShoppingBag className="h-5 w-5" /> Order Now
                </Button>
              </Link>
              <Link to="/wholesale">
                <Button size="lg" variant="outline" className="rounded-xl gap-2 text-base px-8 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                  🏪 Wholesale Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />
      </section>

      {/* Stats */}
      <section className="border-b bg-card py-8">
        <div className="container grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-sm font-semibold md:text-base">{stat.label}</h3>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Offers Banner */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="grid gap-4 sm:grid-cols-2">
            {offers.map((offer, i) => (
              <motion.div
                key={offer.title}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${offer.color} p-6 text-primary-foreground`}
              >
                <span className="absolute right-4 top-4 rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs font-bold backdrop-blur-sm">
                  {offer.tag}
                </span>
                <h3 className="font-heading text-lg font-bold">{offer.title}</h3>
                <p className="mt-1 text-sm opacity-90">{offer.desc}</p>
                <Link to="/products">
                  <Button size="sm" variant="secondary" className="mt-3 rounded-lg gap-1">
                    Shop Now <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold">Shop by Category</h2>
            <Link to="/products" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/products?category=${cat.name}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
                >
                  <span className="text-4xl">{cat.emoji}</span>
                  <span className="font-heading text-sm font-semibold group-hover:text-primary transition-colors">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold">Popular Products</h2>
              <p className="text-sm text-muted-foreground mt-1">Most ordered items this week</p>
            </div>
            <Link to="/products" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              See All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {popularProducts?.slice(0, 8).map((product: any) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  unit={product.unit}
                  image_url={product.image_url}
                  stock={product.stock}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-10 md:py-14">
        <div className="container">
          <h2 className="font-heading text-2xl font-bold text-center mb-2">What Our Customers Say</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Trusted by 1000+ families in Dinanagar</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border bg-card p-5 space-y-3"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`h-4 w-4 ${j < t.rating ? "fill-primary text-primary" : "text-muted"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.village}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-primary/80 py-12">
        <div className="container text-center text-primary-foreground">
          <Heart className="mx-auto h-8 w-8 mb-3 opacity-80" />
          <h2 className="font-heading text-2xl font-bold mb-3">Ready to Order?</h2>
          <p className="opacity-90 mb-6">Browse 500+ products and get delivered in 30 minutes!</p>
          <Link to="/products">
            <Button size="lg" variant="secondary" className="rounded-xl px-8 shadow-lg">
              Browse Products →
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
