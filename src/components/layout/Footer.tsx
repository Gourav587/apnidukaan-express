import { Phone, MapPin, Clock } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container py-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-primary mb-3">🛒 ApniDukaan</h3>
          <p className="text-sm text-muted-foreground">Dinanagar ka apna online kirana store. Ghar baithe order karo, 30 minute mein delivery.</p>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/products" className="hover:text-primary transition-colors">All Products</a></li>
            <li><a href="/orders" className="hover:text-primary transition-colors">My Orders</a></li>
            <li><a href="/auth" className="hover:text-primary transition-colors">Login / Signup</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Main Bazaar, Dinanagar, Punjab</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 8 AM – 9 PM Daily</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3">Delivery Areas</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Dinanagar</li>
            <li>Awankha</li>
            <li>Taragarh</li>
            <li>Kahnuwan</li>
          </ul>
        </div>
      </div>
      <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
        © 2026 ApniDukaan. All rights reserved. Made with ❤️ in Dinanagar.
      </div>
    </div>
  </footer>
);

export default Footer;
