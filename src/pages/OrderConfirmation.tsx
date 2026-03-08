import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, MapPin, Clock, Phone, User } from "lucide-react";
import { motion } from "framer-motion";

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  if (!order) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-2xl font-bold mb-3">No Order Found</h1>
        <p className="text-muted-foreground mb-6">Looks like you haven't placed an order yet.</p>
        <Button onClick={() => navigate("/products")} className="rounded-xl">Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 sm:py-8 md:py-14 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-6 sm:mb-8">
        <div className="mx-auto mb-3 sm:mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-secondary/10">
          <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-secondary" />
        </div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold md:text-3xl">Order Placed! 🎉</h1>
        <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-muted-foreground">Thank you for your order. We'll deliver it soon!</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
        {/* Order ID */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Order ID</p>
          <p className="font-mono text-sm font-medium break-all">{order.id}</p>
        </div>

        {/* Delivery Info */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-heading font-semibold">Delivery Details</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{order.customer_name}</span></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{order.phone}</span></div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{order.address}, {order.village}</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{order.delivery_slot}</span></div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-heading font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Items</h2>
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            <div className="flex justify-between text-sm"><span>Delivery</span><span>{order.delivery === 0 ? <span className="text-secondary font-medium">FREE</span> : `₹${order.delivery}`}</span></div>
            <div className="flex justify-between font-heading font-semibold text-lg pt-2 border-t"><span>Total</span><span className="text-primary">₹{order.total}</span></div>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/10 p-4 text-center text-sm text-secondary font-medium">
          💵 Payment: Cash on Delivery
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => navigate("/products")}>Continue Shopping</Button>
          <Button className="flex-1 rounded-xl h-11" onClick={() => navigate("/orders")}>View My Orders</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
