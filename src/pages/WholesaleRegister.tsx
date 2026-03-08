import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, User, Phone, Mail, MapPin, FileText, Lock, ArrowLeft, CheckCircle } from "lucide-react";

const WholesaleRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    ownerName: "", phone: "", email: "", password: "",
    shopName: "", gstNumber: "", village: "", address: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) { toast.error(error.message); setLoading(false); return; }

    // Check wholesale status
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
    if (signupForm.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { name: signupForm.ownerName, phone: signupForm.phone },
        emailRedirectTo: window.location.origin + "/wholesale-register",
      },
    });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Update profile with shop details
    if (data.user) {
      // Wait briefly for trigger to create profile
      await new Promise(r => setTimeout(r, 1000));
      
      await supabase.from("profiles").update({
        shop_name: signupForm.shopName,
        gst_number: signupForm.gstNumber,
        village: signupForm.village,
        address: signupForm.address,
        wholesale_status: "pending",
        customer_type: "retail", // stays retail until approved
      }).eq("user_id", data.user.id);
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
            <Button className="rounded-xl bg-secondary hover:bg-secondary/90" onClick={() => {
              const msg = `🏪 New Wholesale Registration!\n\n👤 ${signupForm.ownerName}\n🏬 ${signupForm.shopName}\n📞 ${signupForm.phone}\n📍 ${signupForm.village}\n\nPlease review and approve.`;
              window.open(`https://wa.me/917888918171?text=${encodeURIComponent(msg)}`, "_blank");
            }}>
              WhatsApp Us for Faster Approval
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <span className="font-heading text-lg font-bold text-secondary">Wholesale Registration</span>
          </div>
        </div>
      </header>

      <div className="container flex items-center justify-center py-8 md:py-12">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
              <Store className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Wholesale Partner Portal</h1>
            <p className="text-sm text-muted-foreground mt-2">
              For village & town shop owners only. Get bulk pricing, credit facility & dedicated support.
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 grid grid-cols-3 gap-3">
            {[
              { icon: "💰", label: "Bulk Prices" },
              { icon: "📒", label: "Khata/Credit" },
              { icon: "🚚", label: "Free Delivery" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border bg-card p-3 text-center">
                <span className="text-2xl">{b.icon}</span>
                <p className="text-xs font-medium mt-1">{b.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Tabs defaultValue="signup" className="rounded-xl border bg-card p-6">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="signup">New Registration</TabsTrigger>
                <TabsTrigger value="login">Existing Partner</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3 mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Owner Details
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Owner Name *</Label>
                      <Input className="rounded-xl mt-1" placeholder="Full name" value={signupForm.ownerName}
                        onChange={(e) => setSignupForm({ ...signupForm, ownerName: e.target.value })} required />
                    </div>
                    <div>
                      <Label className="text-xs">WhatsApp Number *</Label>
                      <Input className="rounded-xl mt-1" placeholder="9876543210" value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} required />
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 mb-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Store className="h-3 w-3" /> Shop Details
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Shop / Business Name *</Label>
                    <Input className="rounded-xl mt-1" placeholder="e.g. Sharma General Store" value={signupForm.shopName}
                      onChange={(e) => setSignupForm({ ...signupForm, shopName: e.target.value })} required />
                  </div>
                  <div>
                    <Label className="text-xs">GST Number (Optional)</Label>
                    <Input className="rounded-xl mt-1" placeholder="e.g. 22AAAAA0000A1Z5" value={signupForm.gstNumber}
                      onChange={(e) => setSignupForm({ ...signupForm, gstNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Village / Town *</Label>
                      <Input className="rounded-xl mt-1" placeholder="Village name" value={signupForm.village}
                        onChange={(e) => setSignupForm({ ...signupForm, village: e.target.value })} required />
                    </div>
                    <div>
                      <Label className="text-xs">Full Address *</Label>
                      <Input className="rounded-xl mt-1" placeholder="Shop address" value={signupForm.address}
                        onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })} required />
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 mb-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Login Credentials
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" className="rounded-xl mt-1" placeholder="you@email.com" value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label className="text-xs">Password *</Label>
                    <Input type="password" className="rounded-xl mt-1" placeholder="Min 6 characters" value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required />
                  </div>

                  <Button type="submit" size="lg" className="w-full rounded-xl bg-secondary hover:bg-secondary/90 mt-2" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Registration"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Your application will be reviewed & approved by our team
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" className="rounded-xl mt-1" placeholder="you@email.com" value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" className="rounded-xl mt-1" placeholder="••••••••" value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                  </div>
                  <Button type="submit" className="w-full rounded-xl bg-secondary hover:bg-secondary/90" disabled={loading}>
                    {loading ? "Logging in..." : "Login to Wholesale Portal"}
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
