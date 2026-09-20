import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
        delay,
      }}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
