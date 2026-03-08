import { useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";

import MobileBottomNav from "./MobileBottomNav";
import CartDrawer from "@/components/cart/CartDrawer";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";
import AIChatbot from "@/components/chatbot/AIChatbot";
import PageTransition from "./PageTransition";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import SwipeBackIndicator from "./SwipeBackIndicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useSwipeBack } from "@/hooks/use-swipe-back";

const Layout = () => {
  const location = useLocation();

  const handleRefresh = useCallback(async () => {
    // Reload current page data by doing a soft refresh
    window.location.reload();
  }, []);

  const { pullDistance, isRefreshing } = usePullToRefresh({ onRefresh: handleRefresh });
  const { swipeDistance, isSwiping } = useSwipeBack();

  return (
    <div className="flex min-h-screen flex-col">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <SwipeBackIndicator swipeDistance={swipeDistance} isSwiping={isSwiping} />
      <Header />
      <main className="flex-1 pb-16 md:pb-0" style={pullDistance > 0 ? { transform: `translateY(${pullDistance}px)`, transition: isRefreshing ? "transform 0.2s" : "none" } : undefined}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <MobileBottomNav />
      <NotificationPrompt />
      <AIChatbot />
    </div>
  );
};

export default Layout;
