
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const smartboardButtonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-xl text-lg font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95",
        success: "bg-green-500 text-white hover:bg-green-600 active:scale-95",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95",
      },
      size: {
        default: "h-14 px-6 py-3 text-lg [&_svg]:size-6",
        sm: "h-12 rounded-lg px-4 text-base [&_svg]:size-5",
        lg: "h-16 rounded-xl px-8 text-xl [&_svg]:size-7",
        xl: "h-20 rounded-2xl px-12 text-2xl [&_svg]:size-8",
        xxl: "h-24 rounded-3xl px-16 text-3xl [&_svg]:size-10",
        icon: "h-14 w-14 [&_svg]:size-6",
        "icon-lg": "h-16 w-16 [&_svg]:size-7",
        "icon-xl": "h-20 w-20 [&_svg]:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SmartboardButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof smartboardButtonVariants> {
  asChild?: boolean
}

const SmartboardButton = React.forwardRef<HTMLButtonElement, SmartboardButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(smartboardButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
SmartboardButton.displayName = "SmartboardButton"

export { SmartboardButton, smartboardButtonVariants }
