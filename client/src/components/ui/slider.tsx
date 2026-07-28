import * as React from "react";

import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, disabled, ...props }, ref) => {
    const val = value ? value[0] : (defaultValue ? defaultValue[0] : min);
    const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min || 1)) * 100));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = parseFloat(e.target.value);
      if (!isNaN(num)) {
        onValueChange?.([num]);
      }
    };

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center py-2", className)}>
        <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <div
            className="absolute h-full bg-primary transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          {...props}
        />
        <div
          className="pointer-events-none absolute h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-transform duration-75"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
