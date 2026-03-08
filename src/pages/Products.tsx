import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/products/ProductCard";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import ProductSearchAutocomplete from "@/components/products/ProductSearchAutocomplete";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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

  // Reset page when filters change
  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);
  const paginatedProducts = filtered.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleCategoryChange = (cat: string) => { setActiveCategory(cat); setPage(1); };
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleSortChange = (val: string) => { setSortBy(val); setPage(1); };

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Our Products</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} available
            </p>
          )}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 mb-4">
        <ProductSearchAutocomplete
          value={search}
          onChange={handleSearchChange}
          placeholder="Search products... (e.g., atta, oil, sugar)"
        />
        </div>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px] rounded-xl shrink-0">
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            className="rounded-full whitespace-nowrap gap-1.5"
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
            {activeCategory === cat && cat !== "All" && products && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {products.filter((p: any) => p.categories?.name === cat).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
          {search && (
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => handleSearchChange("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {paginatedProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                unit={product.unit}
                image_url={product.image_url}
                stock={product.stock}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="contents">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-muted-foreground px-1">…</span>
                      )}
                      <Button
                        variant={p === currentPage ? "default" : "outline"}
                        size="sm"
                        className="rounded-xl h-8 w-8 p-0"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
