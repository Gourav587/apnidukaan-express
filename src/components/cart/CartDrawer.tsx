import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Sparkles } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const DELIVERY_FEE = 30;
const FREE_DELIVERY_THRESHOLD = 500;

const CartDrawer = ({ checkoutPath = "/checkout" }: { checkoutPath?: string }) => {
  const { items, isOpen, setOpen, updateQuantity, removeItem, subtotal } = useCartStore();
  const navigate = useNavigate();
  const sub = subtotal();
  const delivery = sub >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = sub + delivery;
  const progressToFree = Math.min((sub / FREE_DELIVERY_THRESHOLD) * 100, 100);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading">
            <ShoppingBag className="h-5 w-5 text-primary" /> Your Cart
            {items.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-30" />
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm">Add items from our catalog!</p>
            <Button variant="outline" className="rounded-xl mt-2" onClick={() => { setOpen(false); navigate("/products"); }}>
              Browse Products
            </Button>
          </div>
        ) : (
          <>
            {/* Free delivery progress */}
            {delivery > 0 && (
              <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Add <span className="font-semibold text-primary">₹{FREE_DELIVERY_THRESHOLD - sub}</span> more for free delivery
                  </span>
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <Progress value={progressToFree} className="h-1.5" />
              </div>
            )}
            {delivery === 0 && (
              <div className="rounded-xl bg-secondary/10 p-3 text-center text-xs font-medium text-secondary">
                🎉 You've unlocked free delivery!
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto py-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                      <p className="text-sm font-semibold text-primary">₹{item.price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{sub}</span></div>
              <div className="flex justify-between text-sm">
                <span>Delivery</span>
                <span>{delivery === 0 ? <span className="text-secondary font-medium">FREE</span> : `₹${delivery}`}</span>
              </div>
              <div className="flex justify-between font-heading text-lg font-semibold border-t pt-2">
                <span>Total</span><span className="text-primary">₹{total}</span>
              </div>
              <Button
                className="w-full rounded-xl shadow-lg shadow-primary/20"
                size="lg"
                onClick={() => { setOpen(false); navigate(checkoutPath); }}
              >
                Proceed to Checkout → ₹{total}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
