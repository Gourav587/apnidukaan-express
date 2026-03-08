import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Truck, Clock, Package, Wheat, Droplets, Flame, Star } from "lucide-react";

const categories = [
  { name: "Grains", icon: Wheat, color: "bg-accent" },
  { name: "Oil & Ghee", icon: Droplets, color: "bg-accent" },
  { name: "Spices", icon: Flame, color: "bg-accent" },
  { name: "Daily Use", icon: Star, color: "bg-accent" },
];

const stats = [
  { icon: Package, label: "500+ Products", desc: "Wide selection" },
  { icon: Clock, label: "30 Min Delivery", desc: "Super fast" },
  { icon: Truck, label: "Free Above ₹500", desc: "Save on delivery" },
];

const Index = () => {
  return (
    <div>
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
                <Button size="lg" className="rounded-xl gap-2 text-base px-8">
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
        {/* Decorative blobs */}
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />
      </section>

      {/* Stats */}
      <section className="border-b bg-card py-8">
        <div className="container grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-sm font-semibold md:text-base">{stat.label}</h3>
              <p className="hidden text-xs text-muted-foreground sm:block">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="font-heading text-2xl font-bold text-center mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${cat.color}`}>
                    <cat.icon className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <span className="font-heading text-sm font-semibold">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 py-12">
        <div className="container text-center">
          <h2 className="font-heading text-2xl font-bold mb-3">Ready to Order?</h2>
          <p className="text-muted-foreground mb-6">Browse 500+ products and get delivered in 30 minutes!</p>
          <Link to="/products">
            <Button size="lg" className="rounded-xl px-8">
              Browse Products →
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
