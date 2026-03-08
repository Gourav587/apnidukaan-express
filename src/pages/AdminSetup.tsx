import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Mail, Lock, Key } from "lucide-react";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";

const AdminSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", setup_token: "" });

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-setup", {
      body: form,
    });

    setLoading(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Setup failed");
      return;
    }

    setDone(true);
    toast.success("Admin account created!");
  };

  if (done) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/20 border border-secondary/30 mb-6">
            <Shield className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary-foreground mb-2">Admin Account Created!</h1>
          <p className="text-muted-foreground text-sm mb-6">You can now sign in to the admin dashboard.</p>
          <Button onClick={() => navigate("/admin-login")} className="rounded-xl font-heading">
            Go to Admin Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foreground flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-primary-foreground">First-Time Setup</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create your admin account with the setup token</p>
        </div>

        <div className="rounded-2xl border border-border/20 bg-card p-8 shadow-2xl shadow-primary/5">
          <form onSubmit={handleSetup} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Setup Token</Label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="h-12 rounded-xl border-border/50 bg-muted/50 pl-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                  placeholder="Enter your setup token"
                  value={form.setup_token}
                  onChange={(e) => setForm({ ...form, setup_token: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  className="h-12 rounded-xl border-border/50 bg-muted/50 pl-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                  placeholder="admin@yourdomain.com"
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
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={form.password} />
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl font-heading text-base font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Create Admin Account
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          This page only works once • No admin account must exist
        </p>
      </motion.div>
    </div>
  );
};

export default AdminSetup;
