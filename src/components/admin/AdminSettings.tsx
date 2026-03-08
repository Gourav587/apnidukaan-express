import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Store } from "lucide-react";

export function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) {
        const { error } = await supabase.from("store_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["store-settings"] }); toast.success("Settings saved!"); },
    onError: () => toast.error("Failed to save"),
  });

  const fields = [
    { key: "store_name", label: "Store Name", type: "text" },
    { key: "store_phone", label: "Store Phone", type: "text" },
    { key: "store_address", label: "Store Address", type: "text" },
    { key: "delivery_charges", label: "Delivery Charges (₹)", type: "number" },
    { key: "free_delivery_threshold", label: "Free Delivery Above (₹)", type: "number" },
    { key: "tax_percentage", label: "Tax Percentage (%)", type: "number" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your store</p>
      </div>

      <div className="max-w-2xl rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Store Configuration</h3>
            <p className="text-xs text-muted-foreground">Manage store details and charges</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "store_address" ? "sm:col-span-2" : ""}>
              <Label className="text-sm">{f.label}</Label>
              <Input
                type={f.type}
                className="rounded-xl mt-1"
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <Button className="mt-6 rounded-xl gap-1" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
