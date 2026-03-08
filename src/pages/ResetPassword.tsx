import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated successfully!");
    navigate("/");
  };

  if (!isRecovery) {
    return (
      <div className="container flex min-h-[70vh] items-center justify-center py-10">
        <div className="w-full max-w-md text-center">
          <KeyRound className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <h1 className="font-heading text-xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground mb-4">This link is invalid or has expired.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/auth")}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
          <h1 className="font-heading text-2xl font-bold">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              className="rounded-xl mt-1"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              className="rounded-xl mt-1"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
