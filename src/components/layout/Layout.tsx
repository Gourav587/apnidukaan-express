import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import CartDrawer from "@/components/cart/CartDrawer";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";

const Layout = () => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
    <CartDrawer />
    <WhatsAppButton />
    <NotificationPrompt />
  </div>
);

export default Layout;
