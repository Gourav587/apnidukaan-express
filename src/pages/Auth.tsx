import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShoppingBag, ArrowRight, Truck, Clock, Shield, Mail, Lock, User, Phone } from "lucide-react";
import { useRateLimit } from "@/hooks/use-rate-limit";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const loginRate = useRateLimit();
  const signupRate = useRateLimit();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRate.isLocked) {
      toast.error(`Too many attempts. Try again in ${loginRate.cooldownSeconds}s`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(loginForm);
    setLoading(false);
    if (error) {
      loginRate.recordAttempt();
      toast.error(error.message);
      return;
    }
    loginRate.resetAttempts();
    toast.success("Logged in!");
    navigate(redirectTo);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Enter your email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset link sent! Check your email.");
    setShowForgot(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupRate.isLocked) {
      toast.error(`Too many attempts. Try again in ${signupRate.cooldownSeconds}s`);
      return;
    }
    const name = signupForm.name.trim();
    const phone = signupForm.phone.trim();
    if (name.length < 2 || name.length > 100) { toast.error("Name must be 2-100 characters"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit phone number"); return; }
    if (signupForm.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { name, phone },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      signupRate.recordAttempt();
      toast.error(error.message);
      return;
    }
    signupRate.resetAttempts();
    toast.success("Account created! Check your email to verify.");
  };

  const features = [
    { icon: Truck, text: "Free delivery above ₹500" },
    { icon: Clock, text: "30-minute delivery" },
    { icon: Shield, text: "100% genuine products" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }} />
        </div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <ShoppingBag className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-heading">ApniDukaan</h1>
              <p className="text-white/70 text-sm">Dinanagar ka apna kirana store</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-6 leading-tight">
            Ghar baithe grocery order karo, <br />
            <span className="text-white/80">30 minute mein delivery!</span>
          </h2>
          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div key={f.text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Welcome to ApniDukaan</h1>
            <p className="text-sm text-muted-foreground mt-1">Login or create an account to start shopping</p>
          </div>
          <div className="hidden lg:block mb-8">
            <h2 className="font-heading text-2xl font-bold">Welcome back!</h2>
            <p className="text-sm text-muted-foreground mt-1">Login or create your account to continue</p>
          </div>

          <Tabs defaultValue="login" className="rounded-2xl border bg-card p-6 shadow-sm">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-medium">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-medium">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <AnimatePresence mode="wait">
                {!showForgot ? (
                  <motion.form key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" className="h-11 rounded-xl pl-10" placeholder="you@email.com" value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type={showLoginPw ? "text" : "password"} className="h-11 rounded-xl pl-10 pr-10" placeholder="••••••••" value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                        <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowLoginPw(!showLoginPw)}>
                          {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button type="button" className="text-xs text-primary font-medium hover:underline" onClick={() => setShowForgot(true)}>
                        Forgot password?
                      </button>
                    </div>

                    {loginRate.isLocked && (
                      <p className="text-xs text-destructive text-center">Too many attempts. Try again in {loginRate.cooldownSeconds}s</p>
                    )}

                    <Button type="submit" className="h-11 w-full rounded-xl font-semibold text-sm" disabled={loading || loginRate.isLocked}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Logging in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Login <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-heading text-lg font-bold">Reset Password</h3>
                      <p className="text-xs text-muted-foreground mt-1">We'll send you a reset link</p>
                    </div>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" className="h-11 rounded-xl pl-10" placeholder="Enter your email" value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)} required />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1 h-10 rounded-xl text-sm" disabled={loading}>
                          {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                        <Button type="button" variant="outline" className="h-10 rounded-xl text-sm" onClick={() => setShowForgot(false)}>
                          Back
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="signup">
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="h-11 rounded-xl pl-10" placeholder="Your name" maxLength={100} value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">WhatsApp Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="h-11 rounded-xl pl-10" placeholder="9876543210" maxLength={10} value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value.replace(/\D/g, "") })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" className="h-11 rounded-xl pl-10" placeholder="you@email.com" value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showSignupPw ? "text" : "password"} className="h-11 rounded-xl pl-10 pr-10" placeholder="Min 6 characters" value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required />
                    <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupPw(!showSignupPw)}>
                      {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {signupRate.isLocked && (
                  <p className="text-xs text-destructive text-center">Too many attempts. Try again in {signupRate.cooldownSeconds}s</p>
                )}

                <Button type="submit" className="h-11 w-full rounded-xl font-semibold text-sm" disabled={loading || signupRate.isLocked}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  By signing up, you agree to our Terms of Service
                </p>
              </motion.form>
            </TabsContent>
          </Tabs>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Shop owner?{" "}
              <Link to="/wholesale-register" className="font-semibold text-secondary hover:underline">
                Register for Wholesale Prices →
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
