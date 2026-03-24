# Forms y Checklists de Auditoría UI/UX

## Checklist de Pre-Implementación

### Antes de Crear un Nuevo Componente

- [ ] ¿Existe un componente similar que puedo reutilizar?
- [ ] ¿He revisado el sistema de diseño en `globals.css`?
- [ ] ¿Estoy usando las variables CSS correctas?
- [ ] ¿He considerado dark mode desde el inicio?
- [ ] ¿Tengo claro el caso de uso y contexto?
- [ ] ¿He planificado los estados (default, hover, active, disabled)?
- [ ] ¿He considerado la responsividad?</.Println>

### Checklist de Diseño Visual

- [ ] **Jerarquía Visual**
  - [ ] Títulos más grandes que el texto
  - [ ] Elementos importantes más prominentes
  - [ ] Contraste claro entre secciones

- [ ] **Espaciado**
  - [ ] Usar múltiplos de 8px (p-4, gap-4, etc.)
  - [ ] Consistencia en márgenes
  - [ ] Espacio generoso entre elementos interactivos

- [ ] **Tipografía**
  - [ ] Máximo 3 tamaños de fuente por vista
  - [ ] Line height entre 1.4-1.6 para texto
  - [ ] Uso de font-medium solo para énfasis

- [ ] **Colores**
  - [ ] Solo colores del sistema de diseño
  - [ ] Contraste mínimo 4.5:1 para texto
  - [ ] Estados con colores semánticos (success, error, warning)

- [ ] **Bordes y Sombras**
  - [ ] Redondeados consistentes (radius-md para buttons, radius-lg para cards)
  - [ ] Sombras sutiles (no excesivas)
  - [ ] Bordes con color del sistema (--border)

---

## Checklist de Accesibilidad (WCAG 2.1 AA)

### Perceivable

- [ ] **Texto Alternativo**
  - [ ] Todas las imágenes tienen alt descriptivo
  - [ ] Imágenes decorativas tienen alt="" o aria-hidden
  - [ ] Íconos con significado tienen aria-label

- [ ] **Contraste de Color**
  - [ ] Texto normal: ratio ≥ 4.5:1
  - [ ] Texto grande (18px+): ratio ≥ 3:1
  - [ ] UI components: ratio ≥ 3:1

- [ ] **Contenido Multimedia**
  - [ ] Videos tienen subtítulos
  - [ ] Audio tiene transcripción

### Operable

- [ ] **Navegación por Teclado**
  - [ ] Todos los elementos son accesibles via Tab
  - [ ] Orden de tab lógico
  - [ ] Focus visible con outline claro
  - [ ] Escape cierra modals/dropdowns

- [ ] **Touch Targets**
  - [ ] Botones mínimo 44x44px
  - [ ] Espacio suficiente entre targets

- [ ] **Animaciones**
  - [ ] Respetar prefers-reduced-motion
  - [ ] Animaciones no parpadeantes

### Understandable

- [ ] **Formularios**
  - [ ] Labels asociados con inputs
  - [ ] Errores descriptivos
  - [ ] Instrucciones claras

- [ ] **Consistencia**
  - [ ] Navegación predecible
  - [ ] Nombres de links descriptivos

### Robust

- [ ] **Compatibilidad**
  - [ ] Funciona con screen readers
  - [ ] Funciona con zoom hasta 200%
  - [ ] HTML semántico correcto

---

## Checklist de Dark Mode

### Verificación de Dark Mode

- [ ] **Colores**
  - [ ] No colores hardcodeados
  - [ ] Uso de variables CSS (--background, --foreground, etc.)
  - [ ] Fondos oscuros con texto claro
  - [ ] Bordes visibles en dark mode

- [ ] **Imágenes**
  - [ ] Logos con versión dark
  - ] Íconos visibles en fondo oscuro
  - [ ] Gráficos adaptados

- [ ] **Estados**
  - [ ] Hover visible
  - [ ] Focus visible
  - [ ] Active/pressed visible

- [ ] **Contraste**
  - [ ] Verificar legibilidad
  - [ ] Texto secundario legible
  - [ ] Placeholders visibles

---

## Checklist de Responsive Design

### Mobile First

- [ ] **Layout Base Mobile**
  - [ ] Single column por defecto
  - [ ] Contenido crítico visible
  - [ ] Touch targets adecuados

- [ ] **Breakpoints**
  - [ ] sm (640px): Tablets small
  - [ ] md (768px): Tablets
  - [ ] lg (1024px): Laptops
  - [ ] xl (1280px): Desktops

- [ ] **Navegación Mobile**
  - [ ] Menú hamburguesa
  - [ ] Sidebar como drawer
  - [ ] Acciones accesibles

- [ ] **Tablas**
  - [ ] Scroll horizontal si es necesario
  - [ ] Cards en mobile como alternativa
  - [ ] Columnas críticas visibles

- [ ] **Formularios**
  - [ ] Inputs full width en mobile
  - [ ] Labels sobre inputs
  - [ ] Botones apilados en mobile

---

## Checklist de Rendimiento

### Optimización

- [ ] **JavaScript**
  - [ ] Componentes pesados con lazy loading
  - [ ] Memoización de cálculos costosos
  - [ ] useCallback para handlers
  - [ ] Evitar re-renders innecesarios

- [ ] **CSS**
  - [ ] No estilos inline
  - [ ] Clases Tailwind en lugar de CSS custom
  - [ ] Animaciones con will-change si es necesario

- [ ] **Imágenes**
  - [ ] Formato WebP/AVIF
  - [ ] Lazy loading
  - [ ] Srcset para responsive
  - [ ] Alt text presente

- [ ] **Fuentes**
  - [ ] Font-display: swap
  - [ ] Preload de fuentes críticas
  - [ ] Subset de fuentes

---

## Checklist de Estados de Componentes

### Button

- [ ] Default: Apariencia base
- [ ] Hover: Cambio visual sutil
- [ ] Active/Pressed: Feedback de click
- [ ] Focus: Ring visible
- [ ] Disabled: Opacidad reducida, cursor not-allowed
- [ ] Loading: Spinner, opacidad, cursor wait

### Input/Select

- [ ] Default: Borde normal
- [ ] Hover: Borde más visible
- [ ] Focus: Ring + borde accent
- [ ] Error: Borde error + mensaje
- [ ] Success: Borde success (opcional)
- [ ] Disabled: Opacidad + fondo diferente
- [ ] Filled: Contenido visible

### Card

- [ ] Default: Borde sutil
- [ ] Hover (si es interactivo): Sombra + borde más visible
- [ ] Active: Escala sutil
- [ ] Selected: Borde accent + fondo muted
- [ ] Disabled: Opacidad reducida

### Modal/Dialog

- [ ] Closed: No visible
- [ ] Opening: Animación fade-in
- [ ] Open: Visible con backdrop
- [ ] Closing: Animación fade-out

---

## Template de Auditoría UI/UX

### Auditoría de Página/Componente

```markdown
## Auditoría: [Nombre del Componente/Página]

### Fecha: [YYYY-MM-DD]
### Auditor: [Nombre]

---

### 1. Diseño Visual
**Score: ★★★☆☆ (3/5)**

**Fortalezas:**
- [ ] ...

**Problemas:**
- [ ] ...

**Mejoras Sugeridas:**
- [ ] ...

---

### 2. Accesibilidad
**Score: ★★★★☆ (4/5)**

**Fortalezas:**
- [ ] ...

**Problemas:**
- [ ] ...

**Mejoras Sugeridas:**
- [ ] ...

---

### 3. Dark Mode
**Score: ★★★☆☆ (3/5)**

**Problemas:**
- [ ] ...

---

### 4. Responsive Design
**Score: ★★★★★ (5/5)**

**Dispositivos Probados:**
- [ ] Mobile (320px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)

---

###5. Rendimiento
**Score: ★★★★☆ (4/5)**

**Lighthouse Score:**
- Performance: XX
- Accessibility: XX
- Best Practices: XX
- SEO: XX

---

### 6. Estados de Componentes
**Estados Implementados:**
- [ ] Default
- [ ] Hover
- [ ] Focus
- [ ] Active
- [ ] Disabled
- [ ] Loading
- [ ] Error

---

### Prioridad de Mejoras

| Prioridad | Issue | Acción | Estimación |
|-----------|-------|--------|------------|
| Alta | ... | ... | X horas |
| Media | ... | ... | X horas |
| Baja | ... | ... | X horas |

---

### Resumen
**Score Total: XX/30**

**Recomendación Final:**...
```

---

## Template de Nuevo Componente

### Estructura de Archivos

```
components/
  ui/
    component-name.tsx
```

### Template Base

```tsx
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const componentNameVariants = cva(
  'base-classes-here',
  {
    variants: {
      variant: {
        default: 'bg-background border-border',
        primary: 'bg-accent text-white',
        secondary: 'bg-background-secondary',
      },
      size: {
        sm: 'text-sm px-3 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface ComponentNameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentNameVariants> {
  children: React.ReactNode
}

export function ComponentName({
  className,
  variant,
  size,
  children,
  ...props
}: ComponentNameProps) {
  return (
    <div
      className={cn(componentNameVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </div>
  )
}
```

---

## Checklist de Implementación

### Antes de Empezar
- [ ] Revisar diseño/mockup
- [ ] Identificar componentes existentes
- [ ] Planificar estructura de archivos
- [ ] Definir props interface

### Durante el Desarrollo
- [ ] Usar sistema de diseño (variables CSS)
- [ ] Implementar todos los estados
- [ ] Agregar dark mode
- [ ] Hacer responsive
- [ ] Agregar accesibilidad

### Después de Implementar
- [ ] Verificar en múltiples navegadores
- [ ] Probar dark mode
- [ ] Probar responsive
- [ ] Verificar accesibilidad (Lighthouse)
- [ ] Performance check
- [ ] Code review

---

## Puntuación de Calidad

### Escala de Evaluación

| Score | Significado | Acción |
|-------|-------------|--------|
| ★★★★★ | Excepcional | Listo para producción |
| ★★★★☆ | Bueno | Pequeñas mejoras recomendadas |
| ★★★☆☆ | Aceptable | Mejoras necesarias antes de producción |
| ★★☆☆☆ | Deficiente | Requiere rediseño |
| ★☆☆☆☆ | Crítico | No debe ir a producción |

### Criterios por Categoría

**Diseño Visual (5 puntos)**
- Jerarquía clara
- Espaciado consistente
- Colores del sistema
- Tipografía correcta
- Bordes y sombras apropiados

**Accesibilidad (5 puntos)**
- Contraste WCAG AA
- Navegación por teclado
- Screen reader compatible
- Touch targets adecuados
- Reduced motion support

**Dark Mode (5 puntos)**
- Variables CSS usadas
- Contraste verificado
- Estados visibles
- Imágenes adaptadas
- Bordes visibles

**Responsive (5 puntos)**
- Mobile first
- Breakpoints correctos
- Touch friendly
- Navegación adaptada
- Tablas responsive

**Rendimiento (5 puntos)**
- Lazy loading
- Memoización
- No CSS inline
- Imágenes optimizadas
- Fuentes optimizadas

**Estados (5 puntos)**
- Default + Hover + Active
- Focus + Disabled
- Loading + Error
- Consistencia
- Feedback visual

**Total Máximo: 30 puntos**

---

## Herramientas de Auditoría

### Lighthouse Checks
```bash
# Ejecutar Lighthouse desde CLI
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

### axe-core Checks
```bash
# Integrar con testing
npm install --save-dev @axe-core/react
```

### Pa11y Checks
```bash
# Auditoría de accesibilidad
npx pa11y http://localhost:3000
```

### Contrast Checker
```javascript
// Ratio de contraste mínimo
const contrastRatio = {
  normalText: 4.5,  // WCAG AA
  largeText: 3,     // WCAG AA
  uiComponents: 3,  // WCAG AA
}
```