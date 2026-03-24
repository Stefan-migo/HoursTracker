# Guía deEstilo Apple/Mac para UIWeb

## Principios Fundamentales

### 1. Claridad
- El texto debe ser legible en todos los tamaños
- Los íconos deben ser precisos y claros
- Los adornos deben ser sutiles y apropiados
- La funcionalidad debe ser clara desde el diseño

### 2. Deferencia
- La UI fluida e intuitiva
- El contenido es el protagonista
- La navegación es clara y predecible
- Las transiciones son suaves y naturales

### 3. Profundidad
- Las capas visuales son informativas
- El contenido es dinámico y vivo
- El contexto espacial es claro
- Las transiciones son naturales

---

## Sistema de Colores

### Paleta de Colores Apple

#### Grises Neutros (Light Mode)
```css
--gray-50: #f5f5f7  /* Fondo secundario */
--gray-100: #e8e8ed  /* Bordes sutiles */
--gray-200: #d2d2d7  /* Bordes normales */
--gray-300: #86868b  /* Texto secundario */
--gray-400: #6e6e73  /* Texto terciario */
--gray-500: #1d1d1f  /* Texto principal */
--gray-600: #0a0a0a  /* Texto enfatizado */
```

#### Grises Neutros (Dark Mode)
```css
--gray-50-dark: #1c1c1e   /* Fondo secundario */
--gray-100-dark: #2c2c2e  /* Bordes sutiles */
--gray-200-dark: #3a3a3c  /* Bordes normales */
--gray-300-dark: #48484a  /* Elementos terciarios */
--gray-400-dark: #636366  /* Texto terciario */
--gray-500-dark: #8e8e93  /* Texto secundario */
--gray-600-dark: #f5f5f7 /* Texto principal */
```

#### Colores de Acento

```css
/* Azul Apple (Primario) */
--blue: #0a84ff
--blue-hover: #4090ff
--blue-pressed: #0066cc
--blue-muted: rgba(10, 132, 255, 0.15)

/* Verde (Success) */
--green: #30d158
--green-hover: #34c759
--green-muted: rgba(48, 209, 279, 0.15)

/* Naranja (Warning) */
--orange: #ff9f0a
--orange-hover: #ff9500
--orange-muted: rgba(255, 159, 10, 0.15)

/* Rojo (Error/Destroy) */
--red: #ff453a
--red-hover: #ff3b30
--red-muted: rgba(255, 69, 58, 0.15)

/* Púrpura */
--purple: #bf5af2

/* Rosa */
--pink: #ff375f

/* Teal */
--teal: #64d2ff
```

---

## Sistema Tipográfico

### Familia de Fuentes

```css
/*系统中 Apple */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', system-ui

/* Proyecto HoursTracker (Geist equivalente) */
font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui
```

### Escala Tipográfica

```css
/* Tamaños */
--text-xs: 11px / 13px     /* Caption 2 */
--text-sm: 13px / 16px     /* Footnote */
--text-base: 15px / 20px   /* Body */
--text-lg: 17px / 22px     /* Callout */
--text-xl: 20px / 24px     /* Title 3 */
--text-2xl: 22px / 28px    /* Title 2 */
--text-3xl: 28px / 34px    /* Title */
--text-4xl: 34px / 41px    /* Large Title */

/* Pesos */
--font-regular: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700

/* Estilos */
font-style: normal
letter-spacing: -0.01em /* Tracking sutil */
```

### Uso por Contexto

| Contexto | Tamaño | Peso | Uso |
|----------|--------|------|-----|
| Large Title | 34px | Bold | Títulos principales |
| Title | 28px | Semibold | Títulos de sección |
| Title 2 | 22px | Semibold | Subtítulos |
| Title 3 | 20px | Semibold | Cards headers |
| Body | 15px | Regular | Texto principal |
| Callout | 17px | Regular | Énfasis en texto |
| Subhead | 15px | Regular | Metadatos |
| Footnote | 13px | Regular |Texto pequeño |
| Caption | 12px | Regular | Labels, tags |
| Caption 2 | 11px | Regular | Timestamps |

---

## Sistema de Espaciado

### Grid Base (8px)

```css
/* Unidades */
--space-1: 4px   /* Extra tight */
--space-2: 8px   /* Tight */
--space-3: 12px  /* Compact */
--space-4: 16px  /* Default */
--space-6: 24px  /* Comfortable */
--space-8: 32px  /* Relaxed */
--space-12: 48px /* Spacious */
--space-16: 64px /* Section */

/* Tailwind Equivalent */
p-1, m-1, gap-1  → 4px
p-2, m-2, gap-2  → 8px
p-3, m-3, gap-3  → 12px
p-4, m-4, gap-4  → 16px
p-6, m-6, gap-6  → 24px
p-8, m-8, gap-8  → 32px
```

### Aplicación de Espaciado

#### Cards
```css
padding: 16px - 24px
gap between elements: 12px - 16px
margin between cards: 16px
```

#### Forms
```css
padding: 16px
gap between fields: 16px
gap between label and input: 8px
```

#### Navigation
```css
padding: 12px 16px
gap between items: 4px - 8px
```

---

## Sistema de Bordes Redondeados

### Radios Estándar

```css
--radius-xs: 4px   /* Badges chips, small elements */
--radius-sm: 6px   /* Inputs, small buttons */
--radius-md: 10px  /* Buttons, inputs default */
--radius-lg: 14px  /* Cards, modals small */
--radius-xl: 20px  /* Large cards, containers */
--radius-2xl: 28px /* Sheets, large modals */
--radius-full: 9999px /* Circular */
```

### Uso por Componente

| Componente | Radio | Uso |
|------------|-------|-----|
| Badge | 4px | Chips, tags |
| Input small | 6px | Inputs compactos |
| Button small | 6px | Botones compactos |
| Button | 10px | Botones estándar |
| Input | 10px | Inputs estándar |
| Card | 14px | Cards principales |
| Modal | 20px | Modals y dialogs |
| Sheet | 28px | Bottom sheets |

---

## Sistema de Sombras

### Sombras Light Mode

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06)
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.12)
--shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.16)
--shadow-2xl: 0 12px 24px rgba(0, 0, 0, 0.20)
```

### Sombras Dark Mode

```css
--shadow-xs-dark: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-sm-dark: 0 1px 3px rgba(0, 0, 0, 0.4)
--shadow-md-dark: 0 2px 4px rgba(0, 0, 0, 0.5)
--shadow-lg-dark: 0 4px 8px rgba(0, 0, 0, 0.6)
--shadow-xl-dark: 0 8px 16px rgba(0, 0, 0, 0.7)
--shadow-2xl-dark: 0 12px 24px rgba(0, 0,0, 0.8)
```

### Uso por Elevación

| Nivel | Sombra | Uso |
|-------|--------|-----|
| 0 | none | Elementos en superficie |
| 1 | xs | Hover sutil |
| 2 | sm | Cards, inputs focus |
| 3 | md | Dropdowns, popovers |
| 4 | lg | Modals |
| 5 | xl | Floating elements |
| 6 | 2xl | Sheets |

---

## Sistema de Animaciones

### Duraciones

```css
--duration-instant: 0ms
--duration-fast: 150ms
--duration-normal: 200ms
--duration-slow: 300ms
--duration-slower: 400ms
--duration-slowest: 500ms
```

### Curvas de Bezier

```css
--ease-linear: linear
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0.0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Animaciones Predefinidas

```css
/* Fade In */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale In */
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide In */
@keyframes slide-in-from-top {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Spin */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Componentes Estándar

### Botones

#### Variantes
```tsx
// Primary
<Button className="bg-accent text-white hover:bg-accent-hover">
  Primary
</Button>

// Secondary
<Button variant="secondary" className="bg-background-secondary">
  Secondary
</Button>

// Tertiary/ Ghost
<Button variant="ghost" className="hover:bg-background-tertiary">
  Ghost
</Button>

// Destructive
<Button variant="destructive" className="bg-error hover:bg-error/80">
  Delete
</Button>
```

#### Tamaños
```tsx
// Small
<Button size="sm" className="h-8 px-3 text-xs">
  Small
</Button>

// Default
<Button className="h-10 px-4 text-sm">
  Default
</Button>

// Large
<Button size="lg" className="h-12 px-6 text-base">
  Large
</Button>
```

### Cards

```tsx
<Card className="bg-background border-border rounded-lg">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle>Título</CardTitle>
      <Button variant="ghost" size="icon">
        <Icon />
      </Button>
    </div>
    <CardDescription>
      Descripción del contenido
    </CardDescription>
  </CardHeader>
  <CardContent>
    Contenido principal
  </CardContent>
  <CardFooter className="border-t border-border-subtle">
    <Button>Acción</Button>
  </CardFooter>
</Card>
```

### Inputs

```tsx
<div className="space-y-2">
  <Label>Label</Label>
  <Input className="border-border bg-background" />
  <p className="text-xs text-foreground-secondary">
    Helper text
  </p>
</div>
```

### Modals

```tsx
<Dialog>
  <DialogContent className="bg-background border-border rounded-xl max-w-lg">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>
        Descripción
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      Contenido
    </div>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Mejores Prácticas

### Jerarquía Visual
1. **Título**: 28-34px, Bold, Color principal
2. **Subtítulo**: 20-22px, Semibold, Color principal
3. **Cuerpo**: 15-17px, Regular, Color principal
4. **Metadatos**: 13-15px, Regular, Color secundario
5. **Caption**: 11-12px, Regular, Color terciario

### Contraste
- Texto principal: ratio ≥ 4.5:1
- Texto grande: ratio ≥ 3:1
- UI components: ratio ≥ 3:1
- Texto secundario: ratio ≥ 3:1 (mínimo)

### Touch Targets
- Mínimo: 44x44px
- Recomendado: 48x48px
- Espacio entre targets: 8px mínimo

### Responsive
- Mobile first siempre
- Breakpoints: 640px, 768px, 1024px, 1280px
- Contenido crítico visible sin scroll

### Dark Mode
- Usar variables CSS siempre
- Verificar contraste en ambos modos
- Fondos oscuros con texto claro
- Sombras más intensas en dark mode