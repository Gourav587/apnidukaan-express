import { Skeleton } from "@/components/ui/skeleton";

const HeroSkeleton = () => (
  <div>
    {/* Announcement bar skeleton */}
    <div className="bg-primary/10 py-2 flex justify-center">
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Hero skeleton */}
    <section className="py-10 sm:py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto flex flex-col items-center gap-3 sm:gap-4 text-center">
        <Skeleton className="h-7 w-40 sm:w-48 rounded-full" />
        <Skeleton className="h-10 w-72 sm:w-80 md:w-[28rem]" />
        <Skeleton className="h-5 w-56 sm:w-64 md:w-80" />
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </section>

    {/* Stats skeleton */}
    <section className="border-b bg-card py-6 sm:py-8">
      <div className="container">
        <div className="flex gap-4 overflow-hidden sm:grid sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex min-w-[140px] flex-col items-center gap-1.5 sm:min-w-0 sm:gap-2">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Offers skeleton */}
    <section className="py-6 sm:py-8 md:py-12">
      <div className="container">
        <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[85%] sm:min-w-0 h-32 sm:h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </section>

    {/* Categories skeleton */}
    <section className="py-6 sm:py-8 md:py-12">
      <div className="container">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Skeleton className="h-7 w-44 sm:w-52" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[120px] sm:min-w-0">
              <Skeleton className="h-24 sm:h-28 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Product grid skeleton */}
    <section className="py-6 sm:py-8 md:py-12 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-44 sm:w-48" />
            <Skeleton className="h-4 w-52 sm:w-56" />
          </div>
          <Skeleton className="h-4 w-14 sm:w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3.5 sm:h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                  <Skeleton className="h-5 sm:h-6 w-12" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials skeleton */}
    <section className="py-8 sm:py-10 md:py-14">
      <div className="container">
        <div className="flex flex-col items-center gap-1 mb-6 sm:mb-8">
          <Skeleton className="h-7 w-60 sm:w-72" />
          <Skeleton className="h-4 w-48 sm:w-56" />
        </div>
        <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[80%] sm:min-w-0 rounded-2xl border bg-card p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default HeroSkeleton;
