# Referencia de Diseño UI/UX

## Guía de Estilo Apple/Mac

### Principios de Diseño Apple

1. **Claridad**
   - Texto legible en todoslos tamaños
   - Íconos precisos y claros
   - Adornos sutiles y apropiados
   - Funcionalidad clara desde el diseño

2. **Deferencia**
   - UI fluida e intuitiva
   - Contenido es el protagonista
   - Navegación clara y predecible
   - Transiciones suaves

3. **Profundidad**
   - Capas visuales informativas
   - Contenido dinámico
   - Contexto espacial
   - Transiciones naturales

### Sistema de Colores Apple

```css
/* Grises Neutros */
--gray-50: #f5f5f7
--gray-100: #e8e8ed
--gray-200: #d2d2d7
--gray-300: #86868b
--gray-400: #6e6e73
--gray-500: #1d1d1f
--gray-600: #0a0a0a

/* Colores de Acento */
--blue: #0a84ff
--green: #30d158
--orange: #ff9f0a
--red: #ff453a
--purple: #bf5af2
--pink: #ff375f
--teal: #64d2ff

/* Variaciones */
--blue-hover: #4090ff
--blue-muted: rgba(10, 132, 255, 0.15)
```

### Tipografía Apple

```css
/* SF Pro (equivalente Geist) */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Geist', system-ui

/* Escala Tipográfica */
--text-caption2: 11px / 13px     /* text-xs */
--text-footnote: 13px / 16px     /* text-sm */
--text-body: 15px / 20px         /* text-base */
--text-title3: 20px / 24px       /* text-lg */
--text-title2: 22px / 28px       /* text-xl */
--text-title: 28px / 34px       /* text-2xl */
--text-large-title: 34px / 41px /* text-3xl */

/* Pesos */
font-weight: 400 (normal)
font-weight: 500 (medium)
font-weight: 600 (semibold)
font-weight: 700 (bold)
```

### Espaciado Apple (8px Grid)

```css
/* Espaciado Base */
space-1: 4px   /* Tight */
space-2: 8px   /* Compact */
space-3: 12px  /* Default */
space-4: 16px  /* Comfortable */
space-6: 24px  /* Relaxed */
space-8: 32px  /* Spacious */

/* Padding de Componentes */
padding-compact: 8px 12px
padding-default: 12px 16px
padding-comfortable: 16px 20px

/* Margins */
margin-section: 40px
margin-group: 24px
margin-element: 16px
```

### Bordes Redondeados Apple

```css
--radius-xs: 4px   /* Badges chips */
--radius-sm: 6px   /* Inputs, buttons small */
--radius-md: 10px  /* Buttons, inputs */
--radius-lg: 14px  /* Cards */
--radius-xl: 20px  /* Modals, large cards */
--radius-2xl: 28px /* Sheets */
```

### Sombras Apple

```css
/* Elevaciones */
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-default: 0 2px 4px rgba(0, 0, 0, 0.06)
--shadow-raised: 0 4px 8px rgba(0, 0, 0, 0.08)
--shadow-floating: 0 8px 16px rgba(0, 0, 0, 0.12)
--shadow-modal: 0 12px 24px rgba(0, 0, 0, 0.16)

/* Dark Mode */
--shadow-dark-subtle: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-dark-default: 0 2px 4px rgba(0, 0, 0, 0.4)
--shadow-dark-raised: 0 4px 8px rgba(0, 0, 0, 0.5)
```

### Animaciones Apple

```css
/* Duraciones */
--duration-fast: 150ms
--duration-default: 200ms
--duration-slow: 300ms--duration-slower: 400ms

/* Curvas de Bezier */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0.0, 0, 0.2, 1)
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)

/* Animaciones Comunes */
transition-colors: 200ms var(--ease-in-out)
transition-transform: 300ms var(--ease-out)
transition-opacity: 200ms var(--ease-in-out)
```

---

## Guía de Estilo ChatGPT/OpenAI

### Principios de Diseño ChatGPT

1. **Simplicidad Radical**
   - Máximo contenido, mínimo ruido
   - Foco en la conversación
   - UI invisible cuando no es necesaria

2. **Contraste Claro**
   - Fondo oscuro profundo (#000, #1c1c1e)
   - Texto claro sobre fondo oscuro
   - Separadores sutiles entre secciones

3. **Interactividad Sutil**
   - Hover states suaves
   - Focus rings discretos
   - Transiciones rápidas

### Sistema de Colores ChatGPT

```css
/* Fondo */
--bg-primary: #000000
--bg-secondary: #1c1c1e
--bg-tertiary: #2c2c2e
--bg-elevated: #3a3a3c

/* Texto */
--text-primary: #f5f5f7
--text-secondary: #98989d
--text-tertiary: #6e6e73

/* Bordes */
--border-subtle: #2c2c2e
--border-default: #3a3a3c
--border-strong: #4a4a4c

/* Accent */
--accent: #10a37f (verde ChatGPT)
--accent-hover: #0d8c6e
--accent-muted: rgba(16, 163, 127, 0.15)

/* Estados */
--success: #30d158
--warning: #ff9f0a
--error: #ff453a
```

### Tipografía ChatGPT

```css
/* Font Stack */
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui

/* Escalas */
--text-xs: 12px / 16px    /* Captions, metadata */
--text-sm: 14px / 20px    /* Body compact */
--text-base: 16px / 24px  /* Body default */
--text-lg: 18px / 28px    /* Emphasis */
--text-xl: 20px / 28px    /* Headings small */
--text-2xl: 24px / 32px   /* Headings */
--text-3xl: 30px / 36px   /* Display */

/* Pesos */
font-light: 300
font-regular: 400
font-medium: 500
font-semibold: 600
```

### Componentes ChatGPT

#### Cards de Conversación

```tsx
<div className="bg-background-secondary border border-border-subtle rounded-lg p-4">
  <div className="flex items-start gap-3">
    <Avatar className="w-8 h-8" />
    <div className="flex-1 min-w-0">
      <p className="text-foreground text-sm">{message}</p>
    </div>
  </div>
</div>
```

#### Input de Chat

```tsx
<div className="bg-background-tertiary rounded-lg border border-border">
  <textarea className="
    w-full bg-transparent
    text-foreground placeholder:text-foreground-secondary
    resize-none outline-none
    p-4
  " />
  <div className="flex items-center justify-between p-3 pt-0">
    <div className="flex gap-2">
      {/* Attachments */}
    </div>
    <Button className="bg-accent">Send</Button>
  </div>
</div>
```

#### Sidebar

```tsx
<aside className="
  w-64 bg-background-secondary
  border-r border-border-subtle
  flex flex-col
">
  <div className="p-4 border-b border-border-subtle">
    <Button className="w-full">New Chat</Button>
  </div>
  <nav className="flex-1 overflow-y-auto p-2">
    {/* Conversations list */}
  </nav>
</aside>
```

---

## Patrones de Componentes

### Navegación Principal

```tsx
<nav className="
  bg-background/95 backdrop-blur-sm
  border-b border-border-subtle
  sticky top-0 z-50
">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-8 text-accent" />
        <span className="text-lg font-semibold">AppName</span>
      </div> {/* Links */}
      <div className="hidden md:flex items-center gap-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="
              px-4 py-2 rounded-md
              text-foreground-secondary
              hover:text-foreground hover:bg-background-tertiary
              transition-colors
            "
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeSwitch />
        <Avatar />
      </div>
    </div>
  </div>
</nav>
```

### Dashboard Card

```tsx
<Card className="bg-background border-border rounded-lg hover:shadow- raised transition-shadow">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">{title}</CardTitle>
      {icon && <Icon className="h-5 w-5 text-accent" />}
    </div>
    {description && (
      <CardDescription className="text-foreground-secondary">
        {description}
      </CardDescription>
    )}
  </CardHeader>
  <CardContent>
    {children}
  </CardContent>
  {actions && (
    <CardFooter className="border-t border-border-subtle pt-4">
      {actions}
    </CardFooter>
  )}
</Card>
```

### Data Table

```tsx
<div className="bg-background border border-border rounded-lg overflow-hidden">
  {/* Header */}
  <div className="px-6 py-4 border-b border-border">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="flex gap-2">{actions}</div>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-background-secondary">
        {columns.map(col => (
          <th key={col.key} className="
            px-6 py-3 text-left text-xs font-medium
            text-foreground-secondary uppercase tracking-wider
          ">
            {col.header}
          </th>
        ))}
      </thead>
      <tbody className="divide-y divide-border-subtle">
        {rows.map(row => (
          <tr key={row.id} className="hover:bg-background-secondary transition-colors">
            {columns.map(col => (
              <td key={col.key} className="px-6 py-4 text-foreground">
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  {pagination && (
    <div className="px-6 py-4 border-t border-border">
      {pagination}
    </div>
  )}
</div>
```

### Modal Dialog

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="
    bg-background border-border
    rounded-xl shadow-modal
    max-w-lg w-full mx-4
  ">
    <DialogHeader>
      <DialogTitle className="text-xl">{title}</DialogTitle>
      {description && (
        <DialogDescription className="text-foreground-secondary">
          {description}
        </DialogDescription>
      )}
    </DialogHeader>

    <div className="space-y-4">
      {children}
    </div>

    <DialogFooter className="gap-2 sm:gap-0">
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit}>
        Confirmar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Layout

```tsx
<form className="space-y-6">
  {/* Campo de texto */}
  <div className="space-y-2">
    <Label htmlFor="name" className="text-foreground">
      Nombre
    </Label>
    <Input
      id="name"
      className="border-border bg-background"
      placeholder="Ingresa tu nombre"
    />
    <p className="text-xs text-foreground-secondary">
      Este nombre será visible para otros usuarios
    </p>
  </div>

  {/* Select */}
  <div className="space-y-2">
    <Label>Opción</Label>
    <Select>
      <SelectTrigger className="border-border bg-background">
        <SelectValue placeholder="Selecciona..." />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Checkbox */}
  <div className="flex items-center gap-2">
    <Checkbox id="terms" className="border-border" />
    <Label htmlFor="terms" className="text-sm">
      Acepto los términos y condiciones
    </Label>
  </div>

  {/* Submit */}
  <div className="flex justify-end gap-2 pt-4">
    <Button type="button" variant="outline">
      Cancelar
    </Button>
    <Button type="submit">
      Guardar
    </Button>
  </div>
</form>
```

---

## Estados de Componentes

### Button States

```tsx
{/* Estados completos de botón */}
<Button className="
  /* Base */
  px-4 py-2 rounded-md font-medium
  transition-all duration-200
  
  /* Default */
  bg-accent text-white
  
  /* Hover */
  hover:bg-accent-hover
  
  /* Active */
  active:scale-[0.98] active:bg-accent/80
  
  /* Focus */
  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
  
  /* Disabled */
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent
  
  /* Loading */
  data-[loading=true]:opacity-70 data-[loading=true]:cursor-wait
">
  Button Text
</Button>
```

### Input States

```tsx
<Input className="
  /* Base */
  w-full px-3 py-2 rounded-md
  border bg-background
  text-foreground placeholder:text-foreground-secondary
  
  /* Default */
  border-border
  
  /* Hover */
  hover:border-foreground-secondary
  
  /* Focus */
  focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
  
  /* Error */
  data-[error=true]:border-error data-[error=true]:focus:ring-error
  
  /* Disabled */
  disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-background-tertiary
"/>
```

### Card States

```tsx
<Card className="
  /* Base */
  bg-background border border-border rounded-lg
  
  /* Interactive */
  data-[interactive=true]:cursor-pointer
  data-[interactive=true]:hover:shadow-raised
  data-[interactive=true]:hover:border-accent/50
  data-[interactive=true]:active:scale-[0.99]
  
  /* Selected */
  data-[selected=true]:border-accent data-[selected=true]:bg-accent-muted
  
  /* Disabled */
  data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none
"/>
```

---

## Responsive Design

### Breakpoints

```css
sm: 640px   /* Tablets small */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Patrones Responsive

```tsx
{/* Grid Responsive */}
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-4 sm:gap-6
">
  {items}
</div>

{/* Sidebar Responsive */}
<div className="
  hidden lg:block lg:w-64
  lg:fixed lg:left-0 lg:top-16 lg:bottom-0
">
  <Sidebar />
</div>

{/* Mobile Menu */}
<div className="lg:hidden">
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost">Menu</Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-64">
      <Sidebar />
    </SheetContent>
  </Sheet>
</div>

{/* Container Fluid */}
<div className="
  max-w-7xl mx-auto
  px-4 sm:px-6 lg:px-8
">
  {content}
</div>
```

---

## Accesibilidad (A11y)

### ARIA Labels

```tsx
{/* Botón con ícono */}
<Button aria-label="Cerrar menú">
  <X className="h-4 w-4" />
</Button>

{/* Imagen decorativa */}
<img src="decoration.svg" alt="" aria-hidden="true" />

{/* Form con descripción */}
<Input
  id="email"
  aria-describedby="email-hint"
/>
<p id="email-hint" className="text-xs text-foreground-secondary">
  Nunca compartiremos tu email
</p>

{/* Dialog accesible */}
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <DialogTitle id="dialog-title">Título</DialogTitle>
    <DialogDescription id="dialog-description">
      Descripción del dialog
    </DialogDescription>
  </DialogContent>
</Dialog>

{/* Skip link */}
<a 
  href="#main-content" 
  className="
    sr-only focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4
    focus:z-50
  "
>
  Saltar al contenido principal
</a>
```

### Focus Management

```tsx
{/* Focus visible */}
<Button className="
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-accent
  focus-visible:ring-offset-2
">
  Focus
</Button>

{/* Focus trap en modal */}
<Dialog>
  <DialogContent>
    {/* Focusa automáticamente atrapado dentro del dialog */}
  </DialogContent>
</Dialog>

{/* Skip to content */}
<main id="main-content" tabIndex={-1}>
  {/* El usuario puede saltar la navegación con Tab */}
</main>
```

### Reduced Motion

```css
/* Respetar preferencias de movimiento */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast

```tsx
{/* Buen contraste */}
<p className="text-foreground">
  Texto principal sobre fondo
</p>

{/* Contraste débil - usar solo para texto secundario */}
<p className="text-foreground-secondary">
  Texto secundario (ratio ~4.5:1)
</p>

{/* Nunca usar */}
<p className="text-foreground-secondary/50">
  {/* Contraste insuficiente, ilegible */}
</p>
```

---

## Mejores Prácticas de Rendimiento

### Optimización de Componentes

```tsx
{/* Memoización de componentes pesados */}
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* renderizado costoso */}</div>
})

{/* Memoización de cálculos */}
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name))
}, [items])

{/* Callbacks estables */}
const handleClick = useCallback((id) => {
  setSelected(id)
}, [setSelected])
```

### Lazy Loading

```tsx
{/* Código dividido */}
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading:() => <ChartSkeleton />,
  ssr: false
})

{/* Imágenes con lazy loading */}
<img 
  src="image.jpg"
  loading="lazy"
  alt="Description"
/>

{/* Intersection Observer */}
const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1
})
```

### Virtualización

```tsx
{/* Para listas largas */}
import { VirtualList } from '@tanstack/react-virtual'

function LongList({ items }) {
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  })

  return (
    <div ref={parentRef}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <div
          key={virtualRow.key}
          style={{ height: virtualRow.size }}
        >
          {items[virtualRow.index]}
        </div>
      ))}
    </div>
  )
}
```