import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Mail, Lock, BarChart3, Package, Users, Zap } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword(form);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Access denied. Admin privileges required.");
      return;
    }

    setLoading(false);
    toast.success("Welcome back, Admin!");
    navigate("/admin");
  };

  const features = [
    { icon: BarChart3, label: "Real-time Analytics", desc: "Track sales & revenue" },
    { icon: Package, label: "Inventory Management", desc: "Stock alerts & updates" },
    { icon: Users, label: "Customer Management", desc: "Orders & wholesale" },
    { icon: Zap, label: "Quick POS", desc: "Walk-in billing system" },
  ];

  return (
    <div className="min-h-screen bg-foreground flex">
      {/* Left panel - features (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }} />
        </div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground font-heading">ApniDukaan</h1>
              <p className="text-muted-foreground text-xs">Store Management System</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-primary-foreground mb-3 leading-tight font-heading">
            Manage your store <br />from anywhere
          </h2>
          <p className="text-muted-foreground text-sm mb-10">
            Complete control over orders, inventory, analytics and more.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="rounded-xl border border-border/10 bg-card/5 p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-primary-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-primary-foreground">Admin Panel</h1>
            <p className="mt-2 text-sm text-muted-foreground">ApniDukaan — Store Management</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="font-heading text-2xl font-bold text-primary-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to access the dashboard</p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-border/20 bg-card p-8 shadow-2xl shadow-primary/5">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    className="h-12 rounded-xl border-border/50 bg-muted/50 pl-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                    placeholder="admin@apnidukaan.in"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="h-12 rounded-xl border-border/50 bg-muted/50 pl-10 pr-12 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl font-heading text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Access Dashboard
                  </span>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Authorized personnel only • ApniDukaan © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
