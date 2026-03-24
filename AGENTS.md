<!-- 
===============================================================================
AGENTS.md - Guía de Estilo y Mejores Prácticas para Agentes de IA
HoursTracker - Sistema de Gestión de Horas
===============================================================================
Este archivo define las reglas, estilos y patrones que los agentes de IA deben
seguir al trabajar en este proyecto. Incluye referencias a skills disponibles
y mejores prácticas específicas del proyecto.
===============================================================================
-->

<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16+ Breaking Changes

**⚠️ IMPORTANTE:** Esta versión de Next.js tiene cambios significativos.

- APIs, convenciones y estructura de archivos pueden diferir de tu data de entrenamiento
- Lee la guía relevante en `node_modules/next/dist/docs/` antes de escribir código
- Presta atención a los avisos de deprecación
- Us a React 19+ APIs cuando estén disponibles (no uses forwardRef, usa use() en lugar de useContext)
<!-- END:nextjs-agent-rules -->

---

## Skills Disponibles

Este proyecto tiene acceso a las siguientes skills especializadas:

### Skills de UI/UX
- **`senior-frontend-uiux`** (Proyecto) - Super agente especializado en diseño frontend UI/UX senior con estilos Mac/ChatGPT
- **`frontend-ui`** (Global)- Creación de interfaces frontend estéticamente agradables
- **`ui-ux-pro-max`** (Global) - Diseño UI/UX avanzado con 50+ estilos y161 paletas
- **`ui-ux-audit`** (Global) - Auditoría obligatoria para cambios UI/UX
- **`web-design-guidelines`** (Global) - Revisión de código UI paraWeb Interface Guidelines

### Skills de React/Next.js
- **`vercel-react-best-practices`** (Global) - Optimización de rendimiento React/Next.js
- **`vercel-composition-patterns`** (Global) - Patrones de composición escalables
- **`vercel-react-native-skills`** (Global) - Mejores prácticas React Native/Expo

### Skills de Desarrollo
- **`code-reviewer`** (Global) - Revisión de código con checks OWASP Top 10
- **`code-refactoring`** (Global) - Refactoring automático por tamaño/ complejidad
- **`brainstorming`** (Global) - Requerido antes de trabajo creativo
- **`feature-orchestrator`** (Global) - Implementación de features con gap analysis

### Skills de Datos
- **`supabase-postgres-best-practices`** (Global) - Optimización Postgres/Supabase
- **`shownotes-generator`** (Global) - Generación de resúmenes de contenido

---

## Resumen del Proyecto

### Descripción
**HoursTracker** es un sistema de gestión de horas para empleados con:
- Dashboard para administradores y empleados
- Importación de datos desde Excel
- Sistema de disputas
- Comparación de registros
- Autenticación con Supabase

### Stack Tecnológico
- **Framework:** Next.js 16.2.1 (App Router)
- **React:**19.2.4
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS4
- **UI Components:** Radix UI
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Validation:** Zod4
- **Excel:** xlsx

---

## Sistema de Diseño - Estilo Mac/ChatGPT

### Filosofía de Diseño
- **Minimalismo:** Interfaces limpias sin elementos innecesarios
- **Claridad:** Jerarquía visual clara y tipografía legible
- **Consistencia:** Patrones repetibles y coherencia visual
- **Accesibilidad:** WCAG 2.1 AA compliant
- **Dark Mode:** Soporte automático con variables CSS

### Variables CSS (globals.css)

```css
/* Fondos */
--background: #ffffff (light) / #000000 (dark)
--background-secondary: #f5f5f7 (light) / #1c1c1e (dark)
--background-tertiary: #e5e5ea (light) / #2c2c2e (dark)

/* Texto */
--foreground: #1d1d1f (light) / #f5f5f7 (dark)
--foreground-secondary: #98989d

/* Acentos */
--accent: #0a84ff (azul Mac)
--success: #30d158
--warning: #ff9f0a
--error: #ff453a

/* Bordes */
--border: #d2d2d7 (light) / #3a3a3c (dark)
--border-subtle: #e5e5ea (light) / #2c2c2e (dark)

/* Radio */
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--radius-xl: 20px
```

### Tipografía

| Uso | Tamaño | Clase |
|-----|--------|-------|
| Caption | 11px | `text-xs` |
| Footnote | 13px | `text-sm` |
| Body |15px | `text-base` |
| Callout | 17px | `text-lg` |
| Title 3 | 20px | `text-xl` |
| Title 2 | 22px | `text-2xl` |
| Title | 28px | `text-3xl` |

**Familia:** Geist (system-ui fallback)

### Espaciado (Grid 8px)

| Clase | Valor | Uso |
|-------|-------|-----|
| `p-1` / `gap-1` | 4px | Extra tight |
| `p-2` / `gap-2` | 8px | Tight |
| `p-3` / `gap-3` | 12px | Compact |
| `p-4` / `gap-4` | 16px | Default |
| `p-6` / `gap-6` | 24px | Comfortable |
| `p-8` / `gap-8` | 32px | Spacious |

### Bordes Redondeados

| Componente | Radio | Clase |
|------------|-------|-------|
| Badges, chips | 6px | `rounded-sm` |
| Buttons, inputs | 10px | `rounded-md` |
| Cards | 14px | `rounded-lg` |
| Modals | 20px | `rounded-xl` |
| Pills, avatars | full | `rounded-full` |

### Animaciones

```css
animate-fade-in      /* 200ms ease-out */
animate-scale-in     /* 200ms ease-out (scale 0.95 -> 1) */
transition-colors    /* 200ms default */
```

---

## Patrones de Componentes

### Card

```tsx
<Card className="bg-background border-border rounded-lg">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">Título</CardTitle>
    <CardDescription className="text-foreground-secondary">
      Descripción opcional
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
  <CardFooter className="border-t border-border-subtle pt-4">
    {/* Acciones */}
  </CardFooter>
</Card>
```

### Button

```tsx
// Primario
<Button className="bg-accent hover:bg-accent-hover">
  Acción Principal
</Button>

// Secundario
<Button variant="outline" className="border-border">
  Secundario
</Button>

// Ghost
<Button variant="ghost" className="text-foreground-secondary">
  Sutil
</Button>

// Destructivo
<Button variant="destructive" className="bg-error hover:bg-error/80">
  Eliminar
</Button>

// Tamaños
<Button size="sm" >Compacto</Button>
<Button>Default</Button>
<Button size="lg">Grande</Button>
```

### Badge

```tsx
<Badge className="bg-accent-muted text-accent">Activo</Badge>
<Badge variant="secondary" className="bg-background-tertiary">Inactivo</Badge>
<Badge className="bg-success-muted text-success">Completado</Badge>
<Badge className="bg-error-muted text-error">Error</Badge>
<Badge className="bg-warning/10 text-warning">Pendiente</Badge>
```

### Input

```tsx
<div className="space-y-2">
  <Label className="text-foreground">Campo</Label>
  <Input className="border-border bg-background" />
  <p className="text-xs text-foreground-secondary">
    Texto de ayuda
  </p>
</div>
```

### Table

```tsx
<div className="bg-background border border-border rounded-lg overflow-hidden">
  <div className="px-6 py-4 border-b border-border-subtle">
    <h3 className="text-lg font-semibold">Título</h3>
  </div>
  <Table>
    <TableHeader>
      <TableRow className="border-border hover:bg-background-secondary">
        <TableHead className="text-foreground-secondary">Columna</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-border-subtle hover:bg-background-secondary">
        <TableCell className="text-foreground">Dato</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Modal/Dialog

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="bg-background border-border rounded-xl max-w-lg">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription className="text-foreground-secondary">
        Descripción
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Contenido */}
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

---

## Mejores Prácticas de React/Next.js

### Rendimiento

#### Evitar Waterfalls
```tsx
// ❌ Malo - Waterfall
const user = await getUser()
const posts = await getPosts(user.id)

// ✅ Bueno - Paralelo
const [user, posts] = await Promise.all([
  getUser(),
  getPosts(userId)
])
```

#### Bundle Size
```tsx
// ❌ Malo - Barrel import
import { Button, Card, Input } from '@/components'

// ✅ Bueno - Direct import
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ✅ Mejor - Dynamic import para componentes pesados
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
```

#### Memoización
```tsx
// ✅ Extraer trabajo costoso en componentes memoizados
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* renderizado costoso */}</div>
})

// ✅ Memoizar cálculos
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name))
}, [items])

// ✅ Callbacks estables
const handleClick = useCallback((id) => {
  setSelected(id)
}, [setSelected])
```

### Composición

#### Evitar Boolean Props
```tsx
// ❌ Malo - Boolean props proliferan
<Button primary size="large" rounded icon disabled>
  Submit
</Button>

// ✅ Bueno - Variantes explícitas
<Button variant="primary" size="lg" shape="rounded">
  <Icon />
  Submit
</Button>
```

#### Compound Components
```tsx
// ✅ Usar composición en lugar de props
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>Contenido</CardContent>
</Card>

// ❌ Evitar props excesivas
<Card title="Título" content="Contenido" hasImage icon={Icon} />
```

---

## Estructura de Archivos

### Rutas de la Aplicación

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx          # Layout principal con sidebar
│   ├── admin/
│   │   ├── page.tsx        # Dashboard admin
│   │   ├── employees/      # Gestión empleados
│   │   ├── logs/           # Registros
│   │   ├── import/         # Importar Excel
│   │   └── disputes/       # Disputas
│   └── employee/
│       ├── page.tsx        # Dashboard empleado
│       ├── history/        # Mi Historial
│       ├── my-logs/        # Mis Registros
│       └── comparison/    # Comparación
├── api/
│   └── [route handlers]
├── globals.css            # Variables CSS y estilos globales
└── layout.tsx             # Root layout
```

### Componentes

```
components/
├── ui/                    # Componentes base (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── layout/                # Componentes de layout
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── theme-switch.tsx
└── features/              # Componentes específicos
    ├── admin-dashboard-client.tsx
    ├── employee-dashboard-client.tsx
    └── ...
```

---

## Dark Mode

### Implementación
```tsx
// ThemeSwitch component
// Classes: .dark and .light on <html> element

// Siempre usar variables CSS
<div className="bg-background text-foreground">
  {/* Funciona en ambos modos */}
</div>

// ❌ Nunca hardcodear colores
<div className="bg-white text-black">
  {/* Rompe dark mode */}
</div>
```

### Verificación
- [ ] Todos los componentes usan variables CSS
- [ ] Verificar contraste en ambos modos
- [ ] Bordes visibles en dark mode
- [ ] Imágenes/íconos adaptados si es necesario

---

## Accesibilidad (WCAG 2.1 AA)

### Requisitos Mínimos

1. **Contraste**
   - Texto normal: ratio ≥4.5:1
   - Texto grande (18px+): ratio ≥ 3:1
   - UI components: ratio ≥ 3:1

2. **Navegación por Teclado**
   - Todos los elementos accesibles via Tab
   - Focus visible con outline claro
   - Escape cierra modals/dropdowns
   - Skip links para navegación

3. **Screen Readers**
   - Labels asociados con inputs
   - aria-labels descriptivos
   - Alt text en imágenes
   - Roles ARIA apropiados

4. **Touch Targets**
   - Mínimo 44x44px
   - Espacio suficiente entre targets

5. **Animaciones**
   - Respetar prefers-reduced-motion
   - No parpadeos rápidos

```tsx
// ✅ Botón accesible
<Button
  aria-label="Cerrar menú"
  className="focus-visible:ring-2 focus-visible:ring-accent"
>
  <X className="h-4 w-4" />
</Button>

// ✅ Input con label
<Label htmlFor="email">Email</Label>
<Input
  id="email"
  type="email"
  aria-describedby="email-hint"
/>
<p id="email-hint" className="text-xs text-foreground-secondary">
  Nunca compartiremos tu email
</p>

// ✅ Reduced motion support
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Responsive Design

### Breakpoints

| Tamaño | Clase | Min-width |
|--------|-------|-----------|
| sm | `sm:` | 640px |
| md | `md:` | 768px |
| lg | `lg:` | 1024px |
| xl | `xl:` | 1280px |
| 2xl | `2xl:` | 1536px |

### Mobile First

```tsx
// ✅ Mobile first approach
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-4 sm:gap-6
">
  {items}
</div>

// ✅ Sidebar responsive
<div className="hidden lg:block lg:w-64">
  <Sidebar />
</div>

// ✅ Mobile menu
<Sheet>
  <SheetTrigger asChild className="lg:hidden">
    <Button variant="ghost">Menu</Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64">
    <Sidebar />
  </SheetContent>
</Sheet>
```

---

## Convenciones de Código

### Nomenclatura

```tsx
// Componentes: PascalCase
export function UserCard() {}

// Archivos: kebab-case
// user-card.tsx

// Hooks: camelCase con use
function useUserData() {}

// Utilidades: camelCase
export function formatDate() {}

// Constantes: UPPER_SNAKE_CASE
export const MAX_ITEMS = 100

// Tipos/Interfaces: PascalCase
interface User {}
type UserRole = ''
```

### Importaciones

```tsx
// 1. React/Next imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { format } from 'date-fns'
import { z } from 'zod'

// 3. UI Components
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// 4. Custom components
import { UserProfile } from '@/components/features/user-profile'

// 5. Utilities
import { cn } from '@/lib/utils'

// 6. Types
import type { User } from '@/types'

// 7. Constants
import { MAX_ITEMS } from '@/constants'
```

### Exportaciones

```tsx
// ✅ Named exports para componentes
export function Button() {}
export function Card() {}

// ✅ Default export solo para pages
export default function Page() {}

// ✅ Barrel exports en index.ts
export { Button } from './button'
export { Card } from './card'
```

---

## Testing

### Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

### Verificaciones Antes de Commit

1. [ ] `npm run lint` pasa sin errores
2. [ ] `npm run build` compila correctamente
3. [ ] Dark mode funciona en todos los componentes
4. [ ] Responsive design verificado
5. [ ] Accesibilidad verificada (contraste, focus, keyboard)

---

## Recursos Adicionales

### Documentación Interna
- `globals.css` - Variables CSS y estilos
- `.claude/skills/senior-frontend-uiux/` - Skill de UI/UX

### Referencias Externas
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs)
- [date-fns](https://date-fns.org/docs)
- [Supabase](https://supabase.com/docs)

---

## Changelog

### 2025-01-XX
- Agregada skill `senior-frontend-uiux` para diseño UI/UX profesional
- Actualizadas mejores prácticas de React 19 y Next.js 16
- Mejorada estructura y organización del documento
- Agregadas secciones de accesibilidad y responsive design
- Incorporadas mejores prácticas de Vercel (waterfalls, bundle, composition)