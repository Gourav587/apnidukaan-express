import { Skeleton } from "@/components/ui/skeleton";

const ProductSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
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
);

export default ProductSkeleton;
