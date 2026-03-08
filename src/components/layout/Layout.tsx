import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import CartDrawer from "@/components/cart/CartDrawer";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";
import AIChatbot from "@/components/chatbot/AIChatbot";
import PageTransition from "./PageTransition";

const Layout = () => {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <NotificationPrompt />
      <AIChatbot />
    </div>
  );
};

export default Layout;
