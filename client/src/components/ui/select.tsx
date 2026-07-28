import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectContextType {
  value: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemLabels: Map<string, React.ReactNode>;
  registerLabel: (val: string, label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  value: "",
  isOpen: false,
  setIsOpen: () => {},
  itemLabels: new Map(),
  registerLabel: () => {},
});

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ value: propValue, defaultValue = "", onValueChange, children }) => {
  const [selected, setSelected] = React.useState(defaultValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [itemLabels, setItemLabels] = React.useState<Map<string, React.ReactNode>>(new Map());

  const currentValue = propValue !== undefined ? propValue : selected;

  const registerLabel = React.useCallback((val: string, label: React.ReactNode) => {
    setItemLabels((prev) => {
      if (prev.get(val) === label) return prev;
      const next = new Map(prev);
      next.set(val, label);
      return next;
    });
  }, []);

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (propValue === undefined) setSelected(val);
      onValueChange?.(val);
      setIsOpen(false);
    },
    [propValue, onValueChange]
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        isOpen,
        setIsOpen,
        itemLabels,
        registerLabel,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full text-left">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { value, itemLabels } = React.useContext(SelectContext);
  const label = itemLabels.get(value);
  return <span className="block truncate">{label !== undefined ? label : placeholder || value}</span>;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0 transition-transform duration-200" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen } = React.useContext(SelectContext);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute left-0 top-full mt-1 z-50 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1 animate-in fade-in-80 zoom-in-95 duration-100",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

const SelectLabel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("px-2 py-1.5 text-sm font-semibold text-muted-foreground", className)}>{children}</div>
);

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange, registerLabel } = React.useContext(SelectContext);

    React.useEffect(() => {
      registerLabel(value, children);
    }, [value, children, registerLabel]);

    const isSelected = selectedValue === value;

    return (
      <div
        ref={ref}
        onClick={() => onValueChange?.(value)}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent/50 text-accent-foreground font-medium",
          className
        )}
        {...props}
      >
        <span className="block truncate">{children}</span>
        {isSelected && (
          <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

const SelectSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
);

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
