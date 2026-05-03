import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] typo-button",
                destructive: "bg-[var(--color-error)] text-[var(--color-on-primary)] hover:bg-[var(--color-error)]/90",
                outline: "border border-[var(--color-hairline-strong)] bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-strong)] text-[var(--color-ink)]",
                secondary: "bg-[var(--color-surface-card)] text-[var(--color-ink)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-strong)]",
                ghost: "hover:bg-[var(--color-surface-strong)] text-[var(--color-muted)] hover:text-[var(--color-ink)]",
                link: "text-[var(--color-text-link)] underline-offset-4 hover:underline",
                gradient: "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] typo-button",
                "dark-secondary": "bg-[var(--color-surface-dark-elevated)] text-[var(--color-on-dark)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.3)]",
            },
            size: {
                default: "h-10 px-[18px] py-[10px] rounded-[var(--rounded-md)]",
                sm: "h-9 rounded-[var(--rounded-md)] px-3 text-xs",
                lg: "h-12 rounded-[var(--rounded-md)] px-8 text-base",
                icon: "h-10 w-10 rounded-[var(--rounded-md)]",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
