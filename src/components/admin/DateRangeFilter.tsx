import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (date: Date | undefined) => void;
  onToChange: (date: Date | undefined) => void;
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("gap-2 rounded-xl text-xs h-9 min-w-[130px] justify-start", !from && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {from ? format(from, "dd MMM yyyy") : "From date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={from} onSelect={onFromChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">to</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("gap-2 rounded-xl text-xs h-9 min-w-[130px] justify-start", !to && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {to ? format(to, "dd MMM yyyy") : "To date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={to} onSelect={onToChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      {(from || to) && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onFromChange(undefined); onToChange(undefined); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function filterByDateRange<T>(items: T[], from: Date | undefined, to: Date | undefined, getDate: (item: T) => Date): T[] {
  return items.filter((item) => {
    const d = getDate(item);
    if (from && d < from) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
}
