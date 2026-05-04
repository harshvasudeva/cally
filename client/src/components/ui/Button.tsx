import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-background hover:bg-surface-hover hover:text-foreground",
        secondary: "bg-surface-secondary text-foreground hover:bg-surface-tertiary",
        ghost: "hover:bg-surface-hover hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Keeping legacy variants for compatibility
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs active:shadow-none",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-md)] px-3",
        lg: "h-11 rounded-[var(--radius-lg)] px-8",
        icon: "h-10 w-10",
        // Legacy size compatibility
        md: "h-9 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, icon, iconRight, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Legacy support for loading and custom icons if not using asChild
    if (!asChild && (loading || icon || iconRight)) {
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={props.disabled || loading}
          {...props}
        >
          {loading ? (
            <span className="loading-spinner loading-spinner-sm" />
          ) : icon ? (
            <span className="shrink-0">{icon}</span>
          ) : null}
          {children && <span>{children}</span>}
          {iconRight && !loading && (
            <span className="shrink-0">{iconRight}</span>
          )}
        </button>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button
