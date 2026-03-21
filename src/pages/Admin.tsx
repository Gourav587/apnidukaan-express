import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminInventory } from "@/components/admin/AdminInventory";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminWholesale } from "@/components/admin/AdminWholesale";
import { AdminDelivery } from "@/components/admin/AdminDelivery";
import { AdminPOS } from "@/components/admin/AdminPOS";
import { AdminKhata } from "@/components/admin/AdminKhata";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminBilling } from "@/components/admin/AdminBilling";
import { useOrderNotifications } from "@/hooks/use-order-notifications";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useOrderNotifications();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { toast.error("Access denied"); navigate("/admin-login"); return; }
      setIsAdmin(true);
    };
    checkAdmin();
  }, [navigate]);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto bg-background">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="wholesale" element={<AdminWholesale />} />
              <Route path="delivery" element={<AdminDelivery />} />
              <Route path="pos" element={<AdminPOS />} />
              <Route path="khata" element={<AdminKhata />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="billing" element={<AdminBilling />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
