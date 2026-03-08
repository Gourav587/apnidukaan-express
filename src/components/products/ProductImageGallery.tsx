import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImageGalleryProps {
  mainImage: string | null;
  additionalImages: { id: string; image_url: string }[];
  productName: string;
  stock: number;
}

const ProductImageGallery = ({ mainImage, additionalImages, productName, stock }: ProductImageGalleryProps) => {
  // Combine main image with additional images
  const allImages = [
    ...(mainImage ? [{ id: "main", image_url: mainImage }] : []),
    ...additionalImages,
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentImage = allImages[selectedIndex]?.image_url || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  const handlePrev = () => setSelectedIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
  const handleNext = () => setSelectedIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));

  if (allImages.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
        <div className="flex h-full w-full items-center justify-center text-6xl">🛍️</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      {/* Main Image with Zoom */}
      <div
        ref={imageContainerRef}
        className="relative aspect-square overflow-hidden rounded-2xl border bg-muted cursor-crosshair group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={currentImage!}
            alt={productName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full object-cover transition-transform duration-200"
            style={isZoomed ? {
              transform: "scale(2)",
              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
            } : undefined}
          />
        </AnimatePresence>

        {/* Zoom indicator */}
        <div className="absolute bottom-3 right-3 rounded-full bg-background/70 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className="h-4 w-4 text-foreground" />
        </div>

        {/* Stock badges */}
        {stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Out of Stock</span>
          </div>
        )}
        {stock > 0 && stock <= 10 && (
          <span className="absolute right-3 top-3 rounded-full bg-destructive/90 px-3 py-1 text-xs font-medium text-destructive-foreground">
            Only {stock} left
          </span>
        )}

        {/* Navigation arrows (only if multiple images) */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Image counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
            {selectedIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === selectedIndex
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent hover:border-primary/30"
              }`}
            >
              <img
                src={img.image_url}
                alt={`${productName} ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ProductImageGallery;
