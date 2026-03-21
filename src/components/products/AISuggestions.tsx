import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AISuggestionsProps {
  productId: string;
}

const AISuggestions = ({ productId }: AISuggestionsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-suggestions", productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-similar-products", {
        body: { product_id: productId },
      });

      if (error) {
        // Parse error context for actual response
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            return body?.suggestions || [];
          }
        } catch {}
        return [];
      }

      return data?.suggestions || [];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-xl font-bold">AI Suggests For You</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-bold">AI Suggests For You</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((p: any) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={p.price}
            mrp={p.mrp}
            unit={p.unit}
            image_url={p.image_url}
            stock={p.stock}
            max_retail_qty={p.max_retail_qty}
          />
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;
