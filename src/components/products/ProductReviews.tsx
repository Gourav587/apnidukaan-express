import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please login to leave a review");
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
        reviewer_name: user.user_metadata?.name || user.email?.split("@")[0] || "Customer",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      setComment("");
      setRating(5);
      setShowForm(false);
      toast.success("Review submitted! ⭐");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Reviews
            {reviews && reviews.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({reviews.length})</span>
            )}
          </h2>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-sm font-medium">{avgRating}</span>
              <span className="text-xs text-muted-foreground">average</span>
            </div>
          )}
        </div>
        {user && !showForm && (
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setShowForm(true)}>
            <Star className="h-3 w-3" /> Write Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                >
                  <Star className={`h-6 w-6 transition-colors ${s <= (hoverRating || rating) ? "fill-primary text-primary" : "text-muted"}`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Share your experience with this product... (optional)"
            className="rounded-xl resize-none"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-lg" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review: any) => (
            <div key={review.id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {review.reviewer_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.reviewer_name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-primary text-primary" : "text-muted"}`} />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          {!user && (
            <p className="text-xs text-muted-foreground mt-1">
              <a href="/auth" className="text-primary hover:underline">Login</a> to write a review
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
