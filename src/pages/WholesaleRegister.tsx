import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, User, Phone, Mail, MapPin, FileText, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, Truck, CreditCard, IndianRupee } from "lucide-react";
import { useRateLimit } from "@/hooks/use-rate-limit";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const MAX_NAME = 100;
const MAX_SHOP = 150;
const MAX_ADDRESS = 300;

const WholesaleRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const loginRate = useRateLimit();
  const signupRate = useRateLimit();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    ownerName: "", phone: "", email: "", password: "",
    shopName: "", gstNumber: "", village: "", address: "",
  });

  const validateSignup = (): string | null => {
    const { ownerName, phone, shopName, village, address, password, gstNumber } = signupForm;
    if (ownerName.trim().length < 2 || ownerName.trim().length > MAX_NAME)
      return `Owner name must be 2-${MAX_NAME} characters`;
    if (!PHONE_REGEX.test(phone.trim()))
      return "Enter a valid 10-digit phone number starting with 6-9";
    if (shopName.trim().length < 2 || shopName.trim().length > MAX_SHOP)
      return `Shop name must be 2-${MAX_SHOP} characters`;
    if (village.trim().length < 2 || village.trim().length > MAX_ADDRESS)
      return "Village must be 2-300 characters";
    if (address.trim().length < 5 || address.trim().length > MAX_ADDRESS)
      return "Address must be 5-300 characters";
    if (gstNumber.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/.test(gstNumber.trim()))
      return "Invalid GST number format (e.g. 22AAAAA0000A1Z5)";
    if (password.length < 6)
      return "Password must be at least 6 characters";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRate.isLocked) {
      toast.error(`Too many attempts. Try again in ${loginRate.cooldownSeconds}s`);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) {
      loginRate.recordAttempt();
      toast.error(error.message);
      setLoading(false);
      return;
    }
    loginRate.resetAttempts();

    const { data: profile } = await supabase.from("profiles").select("wholesale_status, customer_type").eq("user_id", data.user.id).maybeSingle();
    setLoading(false);

    if (profile?.customer_type === "wholesale" && profile?.wholesale_status === "approved") {
      toast.success("Welcome back!");
      navigate("/wholesale");
    } else if (profile?.wholesale_status === "pending") {
      toast.info("Your application is still under review");
      setSubmitted(true);
    } else if (profile?.wholesale_status === "rejected") {
      toast.error("Your wholesale application was not approved. Contact us for details.");
    } else {
      toast.error("This account is not registered for wholesale. Please sign up.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupRate.isLocked) {
      toast.error(`Too many attempts. Try again in ${signupRate.cooldownSeconds}s`);
      return;
    }

    const validationError = validateSignup();
    if (validationError) { toast.error(validationError); return; }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email.trim(),
      password: signupForm.password,
      options: {
        data: { name: signupForm.ownerName.trim(), phone: signupForm.phone.trim() },
        emailRedirectTo: window.location.origin + "/wholesale-register",
      },
    });

    if (error) {
      signupRate.recordAttempt();
      toast.error(error.message);
      setLoading(false);
      return;
    }
    signupRate.resetAttempts();

    if (data.user) {
      // Retry profile update to handle trigger race condition
      const profilePayload = {
        shop_name: signupForm.shopName.trim(),
        gst_number: signupForm.gstNumber.trim() || null,
        village: signupForm.village.trim(),
        address: signupForm.address.trim(),
        wholesale_status: "pending",
        customer_type: "retail" as const,
      };

      let updated = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        const { error: updateError } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("user_id", data.user.id);
        if (!updateError) { updated = true; break; }
      }

      if (!updated) {
        console.error("Failed to update wholesale profile after retries");
      }
    }


    setLoading(false);
    setSubmitted(true);
    toast.success("Application submitted! We'll review it soon.");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
            <CheckCircle className="h-10 w-10 text-secondary" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-3">Application Under Review</h1>
          <p className="text-muted-foreground mb-2">
            Your wholesale registration has been submitted. Our team will review your shop details and approve your account.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            You'll receive a notification once approved. This usually takes 1-2 business days.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Store
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const benefits = [
    { icon: IndianRupee, label: "Bulk Prices", desc: "Up to 15% off on wholesale orders", emoji: "💰" },
    { icon: CreditCard, label: "Khata/Credit", desc: "Digital ledger for easy tracking", emoji: "📒" },
    { icon: Truck, label: "Free Delivery", desc: "On all orders above ₹2000", emoji: "🚚" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-secondary" />
            <span className="font-heading text-lg font-bold text-secondary">Wholesale Portal</span>
          </div>
        </div>
      </header>

      <div className="container flex items-start justify-center py-8 md:py-12 gap-12">
        {/* Left side - benefits */}
        <div className="hidden lg:block w-80 sticky top-24">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
                <Store className="h-7 w-7 text-secondary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">Partner Program</h2>
                <p className="text-xs text-muted-foreground">Exclusive for shop owners</p>
              </div>
            </div>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <motion.div key={b.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <b.icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-secondary/5 border border-secondary/20 p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Minimum order:</strong> ₹2,000 per order<br />
                <strong className="text-foreground">Approval:</strong> 1-2 business days<br />
                <strong className="text-foreground">Support:</strong> Dedicated WhatsApp line
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right side - forms */}
        <div className="w-full max-w-lg">
          {/* Mobile benefits */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden mb-6">
            <div className="text-center mb-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
                <Store className="h-7 w-7 text-secondary" />
              </div>
              <h1 className="font-heading text-xl font-bold">Wholesale Partner Portal</h1>
              <p className="text-xs text-muted-foreground mt-1">Bulk pricing, credit facility & dedicated support</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {benefits.map((b) => (
                <div key={b.label} className="rounded-xl border bg-card p-3 text-center">
                  <span className="text-xl">{b.emoji}</span>
                  <p className="text-[10px] font-medium mt-1">{b.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-6">
            <h1 className="font-heading text-2xl font-bold">Register Your Shop</h1>
            <p className="text-sm text-muted-foreground mt-1">Fill in your details and we'll set you up</p>
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Tabs defaultValue="signup" className="rounded-2xl border bg-card p-6 shadow-sm">
              <TabsList className="grid w-full grid-cols-2 mb-5 h-11 rounded-xl">
                <TabsTrigger value="signup" className="rounded-lg font-medium">New Registration</TabsTrigger>
                <TabsTrigger value="login" className="rounded-lg font-medium">Existing Partner</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Owner Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Owner Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="Full name" maxLength={MAX_NAME} value={signupForm.ownerName}
                          onChange={(e) => setSignupForm({ ...signupForm, ownerName: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">WhatsApp Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="9876543210" maxLength={10} value={signupForm.phone}
                          onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value.replace(/\D/g, "") })} required />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 mt-2">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Shop Details</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Shop / Business Name *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="e.g. Sharma General Store" maxLength={MAX_SHOP} value={signupForm.shopName}
                        onChange={(e) => setSignupForm({ ...signupForm, shopName: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GST Number (Optional)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input className="h-10 rounded-xl pl-9 text-sm uppercase" placeholder="e.g. 22AAAAA0000A1Z5" maxLength={15} value={signupForm.gstNumber}
                        onChange={(e) => setSignupForm({ ...signupForm, gstNumber: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Village / Town *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="Village name" maxLength={MAX_ADDRESS} value={signupForm.village}
                          onChange={(e) => setSignupForm({ ...signupForm, village: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="Shop address" maxLength={MAX_ADDRESS} value={signupForm.address}
                          onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })} required />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 mt-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Login Credentials</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input type="email" className="h-10 rounded-xl pl-9 text-sm" placeholder="you@email.com" value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input type={showSignupPw ? "text" : "password"} className="h-10 rounded-xl pl-9 pr-10 text-sm" placeholder="Min 6 characters" value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupPw(!showSignupPw)}>
                        {showSignupPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={signupForm.password} />
                  </div>

                  {signupRate.isLocked && (
                    <p className="text-xs text-destructive text-center">Too many attempts. Try again in {signupRate.cooldownSeconds}s</p>
                  )}

                  <Button type="submit" size="lg" className="w-full rounded-xl bg-secondary hover:bg-secondary/90 mt-2 h-11 font-semibold" disabled={loading || signupRate.isLocked}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
                        Submitting...
                      </span>
                    ) : "Submit Registration"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Your application will be reviewed & approved by our team
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
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

                  {loginRate.isLocked && (
                    <p className="text-xs text-destructive text-center">Too many attempts. Try again in {loginRate.cooldownSeconds}s</p>
                  )}

                  <Button type="submit" className="w-full h-11 rounded-xl bg-secondary hover:bg-secondary/90 font-semibold" disabled={loading || loginRate.isLocked}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
                        Logging in...
                      </span>
                    ) : "Login to Wholesale Portal"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleRegister;
