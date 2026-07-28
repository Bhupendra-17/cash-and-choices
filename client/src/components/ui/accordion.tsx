import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccordionContextType {
  value: string[];
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextType>({
  value: [],
  toggleItem: () => {},
});

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: any) => void;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", collapsible = true, defaultValue, value: propValue, onValueChange, className, children, ...props }, ref) => {
    const [selected, setSelected] = React.useState<string[]>(() => {
      if (propValue !== undefined) return Array.isArray(propValue) ? propValue : propValue ? [propValue] : [];
      if (defaultValue !== undefined) return Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [];
      return [];
    });

    const currentValues = propValue !== undefined ? (Array.isArray(propValue) ? propValue : propValue ? [propValue] : []) : selected;

    const toggleItem = React.useCallback(
      (itemValue: string) => {
        let next: string[];
        if (type === "single") {
          if (currentValues.includes(itemValue)) {
            next = collapsible ? [] : currentValues;
          } else {
            next = [itemValue];
          }
        } else {
          if (currentValues.includes(itemValue)) {
            next = currentValues.filter((v) => v !== itemValue);
          } else {
            next = [...currentValues, itemValue];
          }
        }
        if (propValue === undefined) {
          setSelected(next);
        }
        onValueChange?.(type === "single" ? (next[0] || "") : next);
      },
      [type, collapsible, currentValues, propValue, onValueChange]
    );

    return (
      <AccordionContext.Provider value={{ value: currentValues, toggleItem }}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

const ItemContext = React.createContext<{ value: string; isOpen: boolean }>({ value: "", isOpen: false });

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValues } = React.useContext(AccordionContext);
    const isOpen = selectedValues.includes(value);

    return (
      <ItemContext.Provider value={{ value, isOpen }}>
        <div ref={ref} className={cn("border-b", className)} {...props}>
          {children}
        </div>
      </ItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { toggleItem } = React.useContext(AccordionContext);
    const { value, isOpen } = React.useContext(ItemContext);

    return (
      <div className="flex">
        <button
          ref={ref}
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleItem(value)}
          className={cn(
            "flex flex-1 items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left",
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen } = React.useContext(ItemContext);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden text-sm transition-all animate-in fade-in-50 duration-200", className)}
        {...props}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
