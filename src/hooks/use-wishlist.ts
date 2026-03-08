import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function useWishlist() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((w: any) => w.product_id as string);
    },
    enabled: !!userId,
  });

  const toggleWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("login_required");

      const isInWishlist = wishlistItems.includes(productId);
      if (isInWishlist) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: userId, product_id: productId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      toast.success(result.added ? "Added to wishlist ❤️" : "Removed from wishlist");
    },
    onError: (err: any) => {
      if (err.message === "login_required") {
        toast.error("Please login to save to wishlist");
      } else {
        toast.error("Failed to update wishlist");
      }
    },
  });

  const isInWishlist = (productId: string) => wishlistItems.includes(productId);

  return { wishlistItems, isInWishlist, toggleWishlist: toggleWishlist.mutate, isLoggedIn: !!userId };
}
