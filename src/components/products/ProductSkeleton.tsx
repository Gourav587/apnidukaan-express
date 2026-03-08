import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ProductSkeleton = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="flex flex-col overflow-hidden rounded-xl border bg-card">
    <Skeleton className="aspect-square w-full" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  </div>
));

ProductSkeleton.displayName = "ProductSkeleton";

export default ProductSkeleton;
