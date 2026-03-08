import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";


const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Orders = lazy(() => import("./pages/Orders"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const Wholesale = lazy(() => import("./pages/Wholesale"));
const WholesaleRegister = lazy(() => import("./pages/WholesaleRegister"));
const WholesaleCheckout = lazy(() => import("./pages/WholesaleCheckout"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
    <div className="relative">
      <div className="h-16 w-16 rounded-full border-4 border-muted" />
      <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
    <p className="font-heading text-lg font-semibold text-foreground">Loading...</p>
    <p className="text-sm text-muted-foreground">Please wait a moment</p>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="/wholesale" element={<Wholesale />} />
              <Route path="/wholesale-register" element={<WholesaleRegister />} />
              <Route path="/wholesale-checkout" element={<WholesaleCheckout />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
