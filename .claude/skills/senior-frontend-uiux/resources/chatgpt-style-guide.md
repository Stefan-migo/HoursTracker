# Guía de Estilo ChatGPT/OpenAI para UI

## Principios de Diseño

### 1. Minimalismo Radical
- Interfaz limpia y despejada
- Máximo contenido, mínimo ruido visual
- ElementosUI invisibles hasta que se necesiten
- Focus en el contenido, no en la decoración

### 2. Conversación como Centro
- Flujo natural de lectura arriba-abajo
- Mensajes claramente diferenciados
- Input siempre accesible
- Contexto visible pero no intrusivo

### 3. Contraste Elegante
- Fondo oscuro profundo (#000, #171717, #1c1c1e)
- Texto claro sobre fondo oscuro
- Separadores sutiles entre elementos
- Acentos en verde (#10a37f) para acciones

---

## Sistema de Colores ChatGPT

### Paleta Principal (Dark Mode)

```css
/* Fondos */
--bg-primary: #000000      /* Fondo principal */
--bg-secondary: #171717   /* Sidebar, cards */
--bg-tertiary: #1c1c1e    /* Hover states */
--bg-elevated: #212121    /* Modals, dropdowns */
--bg-input: #2f2f2f       /* Input backgrounds */

/* Texto */
--text-primary: #f5f5f7     /* Texto principal */
--text-secondary: #8e8e8e  /* Texto secundario */
--text-tertiary: #6b6b6b   /* Texto terciario */
--text-placeholder: #6b6b6b /* Placeholder */

/* Bordes */
--border-subtle: #212121   /* Bordes sutiles */
--border-default: #2f2f2f  /* Bordes normales */
--border-strong: #3d3d3d   /* Bordes énfasis */

/* Accent */
--accent: #10a37f          /* Verde ChatGPT */
--accent-hover: #0d8c6e    /* Hover */
--accent-muted: rgba(16, 163, 127, 0.1) /* Background */

/* Estados */
--success: #30d158         /* Verde */
--warning: #ff9f0a         /* Naranja */
--error: #ff453a           /* Rojo */
--info: #0a84ffffff        /* Azul */
```

### Light Mode (Alternativo)

```css
/* Fondos */
--bg-primary: #ffffff
--bg-secondary: #f7f7f8
--bg-tertiary: #ececec
--bg-elevated: #ffffff
--bg-input: #f4f4f4

/* Texto */
--text-primary: #1d1d1f
--text-secondary: #6b6b6b
--text-tertiary: #8e8e8e

/* Bordes */
--border-subtle: #ececec
--border-default: #d9d9e3
--border-strong: #b4b4b4

/* Accent */
--accent: #10a37f
--accent-hover: #0d8c6e
```

---

## Sistema Tipográfico

### Familia de Fuentes

```css
/* Principal */
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui

/* Monospace */
font-family: 'Geist Mono', 'SF Mono', 'Menlo', monospace
```

### Escala Tipográfica

```css
/* Tamaños */
--text-xs: 12px / 16px     /* Captions, timestamps */
--text-sm: 14px / 20px     /* Body compact, labels */
--text-base: 16px / 24px   /* Body default */
--text-lg: 18px / 28px     /* Emphasis */
--text-xl: 20px / 28px     /* Headings small */
--text-2xl: 24px / 32px    /* Headings */
--text-3xl: 30px / 36px    /* Display */

/* Pesos */
--font-light: 300
--font-regular: 400
--font-medium: 500
--font-semibold: 600

/* Tracking */
letter-spacing: -0.01em
```

### Uso por Contexto

| Contexto | Tamaño | Peso | Color |
|----------|--------|------|-------|
| Page Title | 30px | Semibold | --text-primary |
| Section Header | 24px | Semibold | --text-primary |
| Card Title | 20px | Medium | --text-primary |
| Body | 16px | Regular | --text-primary |
| Label | 14px | Medium | --text-secondary |
| Caption | 12px | Regular | --text-tertiary |
| Button | 14px | Medium | --text-primary |
| Link | 14-16px | Regular | --accent |

---

## Sistema de Espaciado

### Grid Base (8px)

```css
/* Unidades */
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px

/* Container Widths */
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-chat: 768px  /* Ancho específico para chat */
```

### Aplicación de Espaciado

#### Chat Container
```css
padding: 16px 24px;
max-width: 768px;
margin: 0 auto;
```

#### Message Bubble
```css
padding: 12px 16px;
gap: 16px;
margin-bottom: 24px;
```

#### Input Area
```css
padding: 16px;
margin-top: auto;
```

---

## Sistema de Bordes Redondeados

### Radios Estándar

```css
--radius-sm: 4px    /* Badges, chips */
--radius-md: 8px    /* Buttons, inputs */
--radius-lg: 12px   /* Cards, containers */
--radius-xl: 16px   /* Large cards */
--radius-2xl: 20px  /* Modal windows */
--radius-full: 9999px /* Circular, pills */
```

### Uso por Componente

| Componente | Radio | Notas |
|------------|-------|-------|
| Button | 8px | Full height siempre |
| Input | 8px | Consistente con buttons |
| Card | 12px | Cards de conversación |
| Modal | 20px | Diálogos principales |
| Avatar | full | Circular siempre |
| Badge | 4px | Pills pequeños |
| Toast | 8px | Notificaciones |

---

## Sistema de Sombras

### Sombras Dark Mode

```css
/* Elevaciones en fondo oscuro */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4)
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5)
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6)
--shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.7)

/* Glow Effect */
--glow-accent: 0 0 20px rgba(16, 163, 127, 0.3)
```

### Uso por Elevación

| Nivel | Sombra | Uso |
|-------|--------|-----|
| 0 | none | Sidebar, main content |
| 1 | xs | Hover states |
| 2 | sm | Dropdowns |
| 3 | md | Popovers |
| 4 | lg | Modals |
| 5 | xl | Floating elements |

---

## Sistema de Animaciones

### Duraciones

```css
--duration-fast: 150ms
--duration-normal: 200ms
--duration-slow: 300ms
```

### Transiciones Comunes

```css
/* Hover en elementos */
transition: background-color 150ms ease

/* Fade in/out */
transition: opacity 200ms ease

/* Scale */
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1)

/* Slide */
transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Animaciones Predefinidas

```css
/* Fade In */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pulse Dot */
@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

/* Shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## Componentes Estándar

### Chat Interface

#### Message Container

```tsx
<div className="w-full border-t border-border-subtle">
  <div className="mx-auto max-w-chat px-4 py-6">
    {/* Messages here */}
  </div>
</div>
```

#### Message Bubble (User)

```tsx
<div className="flex gap-4">
  <Avatar className="h-8 w-8 rounded-full" />
  <div className="flex-1 space-y-2">
    <div className="text-sm font-medium text-foreground">
      Usuario
    </div>
    <div className="text-base text-foreground">
      Mensaje del usuario aquí
    </div>
  </div>
</div>
```

#### Message Bubble (Assistant)

```tsx
<div className="flex gap-4">
  <Avatar className="h-8 w-8 rounded-full bg-accent">
    <Icon className="h-4 w-4" />
  </div>
  <div className="flex-1 space-y-2">
    <div className="text-sm font-medium text-foreground">
      ChatGPT
    </div>
    <div className="text-base text-foreground prose">
      Respuesta generada
    </div>
  </div>
</div>
```

### Input Area

```tsx
<div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6">
  <div className="mx-auto max-w-chat px-4">
    <div className="
      relative
      bg-background-tertiary
      border border-border
      rounded-xl
      shadow-lg
    ">
      <textarea
        className="
          w-full bg-transparent
          px-4 py-3
          text-foreground
          placeholder:text-foreground-tertiary
          resize-none outline-none
          min-h-[52px] max-h-[200px]
        "
        placeholder="Escribe un mensaje..."
        rows={1}
      />
      <div className="flex items-center justify-between p-3 pt-0">
        <div className="flex gap-2">
          {/* Buttons left */}
        </div>
        <Button className="bg-accent hover:bg-accent-hover">
          Enviar
        </Button>
      </div>
    </div>
  </div>
</div>
```

### Sidebar

```tsx
<aside className="
  w-64 h-screen
  bg-background-secondary
  border-r border-border-subtle
  flex flex-col
">
  <div className="p-3">
    <Button className="w-full justify-start gap-2 bg-transparent hover:bg-background-tertiary">
      <Plus className="h-4 w-4" />
      Nueva conversación
    </Button>
  </div>
  
  <nav className="flex-1 overflow-y-auto p-2">
    {/* Conversations list */}
  </nav>
  
  <div className="border-t border-border-subtle p-3">
    {/* User info */}
  </div>
</aside>
```

### Card

```tsx
<div className="
  bg-background-secondary
  border border-border-subtle
  rounded-lg
  p-4
  hover:bg-background-tertiary
  transition-colors
">
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-accent" />
    <div>
      <h3 className="font-medium text-foreground">Título</h3>
      <p className="text-sm text-foreground-secondary">
        Descripción
      </p>
    </div>
  </div>
</div>
```

### Button

```tsx
// Primary
<Button className="
  bg-accent
  hover:bg-accent-hover
  text-white
  rounded-md
  px-4 py-2
  transition-colors
">
  Primary Action
</Button>

// Secondary
<Button className="
  bg-transparent
  hover:bg-background-tertiary
  text-foreground
  border border-border
  rounded-md
  px-4 py-2
">
  Secondary
</Button>

// Ghost
<Button className="
  bg-transparent
  hover:bg-background-tertiary
  text-foreground-secondary
  rounded-md
  px-3 py-2
">
  Ghost
</Button>
```

### Code Block

```tsx
<pre className="
  bg-background-secondary
  border border-border-subtle
  rounded-lg
  p-4
  overflow-x-auto
">
  <code className="text-sm font-mono text-foreground">
    {code}
  </code>
</pre>
```

---

## Patrones de Diseño

### Layout Principal

```tsx
<div className="flex h-screen">
  {/* Sidebar */}
  <aside className="w-64 bg-background-secondary border-r border-border-subtle">
    {/* Navigation */}
  </aside>
  
  {/* Main Content */}
  <main className="flex-1 flex flex-col">
    <header className="h-14 border-b border-border-subtle px-4">
      {/* Header */}
    </header>
    
    <div className="flex-1 overflow-y-auto">
      {/* Content */}
    </div>
  </main>
</div>
```

### Responsive

```tsx
{/* Mobile */}
<div className="lg:hidden">
  <MobileNav />
</div>

{/* Desktop */}
<div className="hidden lg:block">
  <DesktopSidebar />
</div>

{/* Container Responsive */}
<div className="
  w-full
  px-4 sm:px-6 lg:px-8
  max-w-7xl mx-auto
">
  {/* Content */}
</div>
```

### Loading States

```tsx
{/* Skeleton */}
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-4 w-5/6" />
</div>

{/* Typing indicator */}
<div className="flex gap-1">
  <div className="h-2 w-2 bg-foreground-tertiary rounded-full animate-bounce" />
  <div className="h-2 w-2 bg-foreground-tertiary rounded-full animate-bounce animation-delay-100" />
  <div className="h-2 w-2 bg-foreground-tertiary rounded-full animate-bounce animation-delay-200" />
</div>
```

---

## Mejores Prácticas

### Accesibilidad
- Contraste mínimo 4.5:1
- Focus visible con outline
- Keyboard navigation
- Screen reader labels
- Reduced motion support

### Rendimiento
- Lazy loading de componentes pesados
- Virtualización para listas largas
- Memoización de componentes
- Debounce en inputs
- Optimistic updates

### Dark Mode
- Usar variables CSS siempre
- Verificar contraste en ambos modos
- Fondos oscuros genuinos (#000, #171717)
- Bordes sutiles pero visibles
- Sombras más intensas

### Interacciones
- Hover states suaves
- Focus rings discretos pero visibles
- Click feedback inmediato
- Loading states claros
- Error messages descriptivos

### Responsive
- Mobile first
- Touch targets 44px mínimo
- Inputs full width en mobile
- Navigation adaptada
- Container width limitado