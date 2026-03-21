import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  stock: number;
  is_active: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedId: string | null;
  onSelect: (variant: Variant) => void;
}

const VariantSelector = ({ variants, selectedId, onSelect }: VariantSelectorProps) => {
  const activeVariants = variants.filter((v) => v.is_active);
  if (activeVariants.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="font-heading text-sm font-semibold mb-2">Size / Weight</h3>
      <div className="flex flex-wrap gap-2">
        {activeVariants.map((v) => (
          <button
            key={v.id}
            onClick={() => v.stock > 0 && onSelect(v)}
            disabled={v.stock <= 0}
            className={cn(
              "relative rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              "hover:border-primary/50 active:scale-[0.97]",
              selectedId === v.id
                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                : "border-border bg-card text-foreground",
              v.stock <= 0 && "opacity-40 cursor-not-allowed line-through"
            )}
          >
            <span>{v.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">₹{v.price}</span>
            {v.stock <= 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                Out
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VariantSelector;
