import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProductSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ProductSearchAutocomplete = ({
  value,
  onChange,
  placeholder = "Search products...",
}: ProductSearchAutocompleteProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products } = useQuery({
    queryKey: ["products-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, unit, image_url")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const suggestions = value.length >= 2
    ? products?.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    setOpen(focused && suggestions && suggestions.length > 0);
  }, [focused, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (productId: string) => {
    setOpen(false);
    setFocused(false);
    navigate(`/product/${productId}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className="pl-10 rounded-xl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        autoComplete="off"
      />
      {open && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {suggestions.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                  "hover:bg-accent transition-colors"
                )}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-10 w-10 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{product.price} / {product.unit}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchAutocomplete;
