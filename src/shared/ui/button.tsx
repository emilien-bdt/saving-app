import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** iOS-like buttons: filled (action), tinted grey (outline), tinted blue (secondary), text (ghost / link). */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[opacity,transform,background-color] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] active:opacity-80 disabled:pointer-events-none disabled:opacity-40 aria-invalid:ring-3 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "bg-muted text-foreground",
        secondary: "bg-primary/12 text-primary",
        ghost: "text-primary hover:bg-muted",
        destructive: "bg-destructive/12 text-destructive",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 gap-1.5 rounded-xl px-4 text-[15px]",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-lg px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-xl px-5 text-[17px] [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
