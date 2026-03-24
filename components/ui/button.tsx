import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-white hover:bg-accent-hover shadow-sm active:scale-[0.98]',
        destructive:
          'bg-error text-white hover:bg-error/90 shadow-sm active:scale-[0.98]',
        outline:
          'border border-border bg-background hover:bg-background-secondary hover:text-foreground shadow-sm active:scale-[0.98]',
        secondary:
          'bg-background-secondary text-foreground hover:bg-background-tertiary shadow-sm active:scale-[0.98]',
        ghost:
          'hover:bg-background-secondary hover:text-foreground',
        link:
          'text-accent underline-offset-4 hover:underline',
        success:
          'bg-success text-white hover:bg-success/90 shadow-sm active:scale-[0.98]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    // When using asChild, Slot expects exactly one child element
    // We must ensure only one child is passed, regardless of loading state
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled || loading}
          {...props}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size="sm" className="text-current" />
              {children}
            </span>
          ) : (
            children
          )}
        </Comp>
      )
    }
    
    // Non-asChild case - can have multiple children
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size="sm" className="text-current" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }