import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/products/ProductCard";
import ProductSkeleton from "@/components/products/ProductSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Package } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "Grains", "Oil & Ghee", "Spices", "Daily Use"];
const SORT_OPTIONS = [
  { value: "name-asc", label: "Name: A-Z" },
  { value: "name-desc", label: "Name: Z-A" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";
  const initialSearch = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState("name-asc");

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products... (e.g., atta, oil, sugar)"
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
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
            onClick={() => setActiveCategory(cat)}
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
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setSearch("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((product: any) => (
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
      )}
    </div>
  );
};

export default Products;
