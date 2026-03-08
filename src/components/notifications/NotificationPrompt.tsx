import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const NotificationPrompt = () => {
  const { supported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Show prompt if: supported, user is logged in, permission not granted yet, not subscribed
    if (supported && user && permission === "default" && !isSubscribed) {
      // Delay showing the prompt
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [supported, user, permission, isSubscribed]);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notifications enabled! 🔔 You'll get updates on your orders.");
      setShow(false);
    } else {
      toast.error("Could not enable notifications. Please allow in browser settings.");
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border bg-card p-4 shadow-xl sm:left-auto sm:right-6"
        >
          <button
            onClick={() => setShow(false)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium pr-4">Get order updates instantly!</p>
              <p className="text-xs text-muted-foreground">
                We'll notify you when your order is confirmed, packed, and out for delivery.
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg" onClick={handleSubscribe} disabled={loading}>
                  {loading ? "Enabling..." : "Enable Notifications"}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setShow(false)}>
                  Later
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;
