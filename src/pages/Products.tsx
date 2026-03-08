import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/products/ProductCard";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import ProductSearchAutocomplete from "@/components/products/ProductSearchAutocomplete";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const CATEGORIES = ["All", "Grains", "Oil & Ghee", "Spices", "Daily Use"];
const SORT_OPTIONS = [
  { value: "name-asc", label: "Name: A-Z" },
  { value: "name-desc", label: "Name: Z-A" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];
const PRODUCTS_PER_PAGE = 20;

const Products = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";
  const initialSearch = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [queryClient]);

  const { pullDistance, isRefreshing } = usePullToRefresh({ onRefresh: handleRefresh });

  const filtered = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p: any) => {
      const matchCategory = activeCategory === "All" || p.categories?.name === activeCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
    const [field, dir] = sortBy.split("-");
    result.sort((a: any, b: any) => {
      const valA = field === "price" ? a.price : a.name.toLowerCase();
      const valB = field === "price" ? b.price : b.name.toLowerCase();
      if (valA < valB) return dir === "asc" ? -1 : 1;
      if (valA > valB) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [products, activeCategory, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);
  const paginatedProducts = filtered.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const handleCategoryChange = (cat: string) => { setActiveCategory(cat); setPage(1); };
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleSortChange = (val: string) => { setSortBy(val); setPage(1); setSortSheetOpen(false); };

  return (
    <div className="container py-4 sm:py-6 md:py-10">
      {/* Title */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold md:text-3xl">Our Products</h1>
          {!isLoading && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} available
            </p>
          )}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 mb-3 sm:mb-4">
        <ProductSearchAutocomplete
          value={search}
          onChange={handleSearchChange}
          placeholder="Search products..."
        />
        {/* Desktop sort */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px] rounded-xl shrink-0 hidden sm:flex">
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Mobile sort button → bottom sheet */}
        <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 rounded-xl sm:hidden h-10 w-10">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Sort By</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 py-4">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className={`text-left rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    sortBy === opt.value ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Category Filters — sticky on mobile */}
      <div className="mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-sm py-2 sm:static sm:bg-transparent sm:backdrop-blur-none">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap gap-1.5 h-8 text-xs sm:h-9 sm:text-sm"
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
              {activeCategory === cat && cat !== "All" && products && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[9px] sm:text-[10px]">
                  {products.filter((p: any) => p.categories?.name === cat).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 sm:py-20 text-center">
          <Package className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mb-3 sm:mb-4" />
          <p className="text-base sm:text-lg font-medium">No products found</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Try a different search or category</p>
          {search && (
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => handleSearchChange("")}>Clear Search</Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {paginatedProducts.map((product: any, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  mrp={product.mrp}
                  unit={product.unit}
                  image_url={product.image_url}
                  stock={product.stock}
                  max_retail_qty={product.max_retail_qty}
                />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
              <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 text-xs sm:text-sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="contents">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-0.5">…</span>}
                      <Button variant={p === currentPage ? "default" : "outline"} size="sm" className="rounded-xl h-8 w-8 p-0 text-xs" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    </span>
                  ))}
              </div>
              <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 text-xs sm:text-sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
