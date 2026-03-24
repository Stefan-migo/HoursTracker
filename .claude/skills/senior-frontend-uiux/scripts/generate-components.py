#!/usr/bin/env python3
"""
Generador de Componentes UI/UX
Crea componentes siguiendo las mejores prácticas de diseño
"""

import os
import sys
from pathlib import Path
from string import Template


COMPONENT_TEMPLATES = {
    "card": """import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'interactive'
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-background border-border',
    elevated: 'bg-background border-border shadow-raised',
    interactive: 'bg-background border-border hover:shadow-raised hover:border-accent/50 cursor-pointer transition-all',
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-6',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: CardProps) {
  return (
    <p className={cn('text-sm text-foreground-secondary', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-border-subtle', className)} {...props}>
      {children}
    </div>
  )
}
""",
    "button": """import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        destructive: 'bg-error text-white hover:bg-error/80',
        outline: 'border border-border bg-background hover:bg-background-secondary',
        secondary: 'bg-background-secondary text-foreground hover:bg-background-tertiary',
        ghost: 'hover:bg-background-secondary hover:text-foreground',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
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
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
""",
    "input": """import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
        'placeholder:text-foreground-secondary',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-tertiary',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
}
""",
    "badge": """import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent-muted text-accent',
        secondary: 'bg-background-tertiary text-foreground-secondary',
        success: 'bg-success-muted text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error-muted text-error',
        outline: 'text-foreground border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
""",
    "modal": """import { cn } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="
          fixed left-[50%] top-[50%] z-50
          w-full max-w-lg
          translate-x-[-50%] translate-y-[-50%]
          bg-background border border-border
          rounded-xl shadow-modal
          p-6
          animate-scale-in
        ">
          <Dialog.Title className="text-xl font-semibold text-foreground">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-foreground-secondary">
              {description}
            </Dialog.Description>
          )}
          {children}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 hover:bg-background-secondary transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4 text-foreground-secondary" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      {children}
    </div>
  )
}
""",
    "table": """import { cn } from '@/lib/utils'

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('[&_tr]:border-b border-border', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border-subtle transition-colors hover:bg-background-secondary/50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-foreground-secondary',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    >
      {children}
    </td>
  )
}
""",
    "avatar": """import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({
  className,
  src,
  alt = '',
  fallback,
  size = 'md',
  ...props
}: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-background-tertiary',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-accent-muted text-accent font-medium">
          {fallback || alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
""",
    "skeleton": """import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular'
}

export function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  const variants = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-background-tertiary',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
""",
    "toast": """import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  onClose?: () => void
}

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  const variants = {
    default: 'bg-background border-border',
    success: 'bg-success-muted border-success/30',
    error: 'bg-error-muted border-error/30',
    warning: 'bg-warning/10 border-warning/30',
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'rounded-lg border p-4 shadow-lg',
        'animate-scale-in',
        variants[variant]
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-background-secondary transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
""",
}


def create_component(component_type: str, component_name: str, output_dir: str):
    if component_type not in COMPONENT_TEMPLATES:
        print(f"Error: Tipo de componente '{component_type}' no válido.")
        print(f"Tipos disponibles: {', '.join(COMPONENT_TEMPLATES.keys())}")
        return False

    template = COMPONENT_TEMPLATES[component_type]
    file_name = f"{component_name or component_type}.tsx"
    output_path = Path(output_dir) / file_name

    # Replace component names based on provided name
    if component_name:
        # This is a simplified approach - in real scenario, would need AST transformation
        content = template.replace(f"component_name", component_name)
    else:
        content = template

    # Create directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    output_path.write_text(content, encoding="utf-8")

    print(f"✅ Componente creado: {output_path}")
    return True


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generador de Componentes UI/UX")
    parser.add_argument(
        "type",
        choices=list(COMPONENT_TEMPLATES.keys()),
        help="Tipo de componente a generar",
    )
    parser.add_argument("name", nargs="?", help="Nombre del componente (opcional)")
    parser.add_argument(
        "-o",
        "--output",
        default="components/ui",
        help="Directorio de salida (default: components/ui)",
    )

    args = parser.parse_args()

    create_component(args.type, args.name, args.output)


if __name__ == "__main__":
    main()
