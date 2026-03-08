import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", name: "", phone: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(loginForm);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Logged in!");
    navigate(redirectTo);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { name: signupForm.name, phone: signupForm.phone },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Check your email to verify.");
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-4xl">🛒</span>
          <h1 className="font-heading text-2xl font-bold mt-2">Welcome to ApniDukaan</h1>
          <p className="text-sm text-muted-foreground mt-1">Login or create an account</p>
        </div>

        <Tabs defaultValue="login" className="rounded-xl border bg-card p-6">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" className="rounded-xl mt-1" placeholder="you@email.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" className="rounded-xl mt-1" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input className="rounded-xl mt-1" placeholder="Your name" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} required />
              </div>
              <div>
                <Label>WhatsApp Number</Label>
                <Input className="rounded-xl mt-1" placeholder="9876543210" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" className="rounded-xl mt-1" placeholder="you@email.com" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" className="rounded-xl mt-1" placeholder="Min 6 characters" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
