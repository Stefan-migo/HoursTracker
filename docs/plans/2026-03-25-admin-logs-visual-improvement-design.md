# Plan: /admin/logs - Mejora Completa de Visualización y Tabla

**Fecha:** 2026-03-25  
**Estado:** Aprobado  
**Tipo:** Feature Enhancement  
**Esfuerzo estimado:** ~18h

---

## 1. Resumen Ejecutivo

Este plan aborda dos necesidades complementarias en la página `/admin/logs`:

1. **Vista Cards alternativa** - Una visualización más digestiva de los registros por empleado
2. **Tabla mejorada** - Paginación real, rango de fechas, y componentes optimizados

Ambas vistas coexistirán con un toggle, compartiran filtros unificados, y mantendrán la funcionalidad existente.

---

## 2. Arquitectura de Vistas

### 2.1 Toggle entre Vistas

```
URL: /admin/logs?view=cards  (default)
     /admin/logs?view=table

UI:  [Cards] [Tabla]  ← Tabs en esquina superior izquierda
```

### 2.2 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│  [Cards] [Tabla]                    [Date Range] [Employee▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ VIEW: CARDS ─────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │  │
│  │  │ Juan P.  │  │ María G. │  │ Carlos L.│                │  │
│  │  │ 176.5h   │  │ 160.0h   │  │  64.0h   │                │  │
│  │  │ ████████ │  │ ███████  │  │ ████     │                │  │
│  │  │ 100% ✅  │  │  87% ⚠️  │  │  36% 🔴  │                │  │
│  │  └──────────┘  └──────────┘  └──────────┘                │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ VIEW: TABLE ─────────────────────────────────────────────┐  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ ◻ │ Trabajador    │ Fecha  │ Entra │ Sale │ Total  │  │  │
│  │  ├───┼───────────────┼────────┼────────┼──────┼────────│  │  │
│  │  │ ☑ │ Juan Pérez   │ Mar 15 │ 08:00 │17:30 │  9.5h  │  │  │
│  │  │ ☐ │ María García │ Mar 15 │ 08:30 │17:00 │  8.5h  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ‹ Anterior  1  2  3  ...  18  Siguiente ›              │  │
│  │  Mostrando 1-20 de 347 registros                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─ SHEET (al click en Card) ──────────────────────────────────────┐
│                                                                     │
│  ╳  Juan Pérez                              [Cerrar]              │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  Registros: 22   Total: 176.5h   Promedio: 8.0h/día               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Fecha     │ Entrada  │ Salida   │ Total  │ Estado           │   │
│  ├───────────┼──────────┼──────────┼────────┼──────────────────│   │
│  │ Mar 15    │  08:00   │  17:30   │  9.5h  │ ✅ Oficial       │   │
│  │ Mar 14    │  08:15   │  17:00   │  8.75h │ ✅ Oficial       │   │
│  │ Mar 13    │  --      │   --     │   --   │ ⚠️ Pendiente    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Ver todos los registros →]                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación de Componentes

### 3.1 ViewToggle (Tabs)

**Ubicación:** `components/features/admin/logs/view-toggle.tsx`

```tsx
interface ViewToggleProps {
  currentView: 'cards' | 'table'
  onViewChange: (view: 'cards' | 'table') => void
}

// Estado: synced con URL param ?view=
// UI: Button group con estilos active/inactive
```

### 3.2 EmployeeCard

**Ubicación:** `components/features/admin/logs/employee-card.tsx`

```tsx
interface EmployeeCardProps {
  employee: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  stats: {
    totalHours: number
    recordCount: number
    averageHours: number
    compliancePercent: number // 0-100
  }
  onClick: () => void
}
```

**Diseño:**
```
┌─────────────────────────────┐
│ 👤 Juan Pérez               │
│ juan@email.com              │
│ ─────────────────────────── │
│ 176.5h                      │
│ ████████████████░░░  100%  │
│                             │
│ 22 registros  •  8.0h/día  │
└─────────────────────────────┘
```

**Estados de Badge:**
- Verde (`bg-success/10 text-success`): ≥90%
- Amarillo (`bg-warning/10 text-warning`): 70-89%
- Rojo (`bg-error/10 text-error`): <70%

### 3.3 EmployeeSheet

**Ubicación:** `components/features/admin/logs/employee-sheet.tsx`

```tsx
interface EmployeeSheetProps {
  employeeId: string | null
  open: boolean
  onClose: () => void
  dateRange: { start: Date; end: Date }
}
```

**Contenido:**
- Header con nombre y stats resumen
- Mini tabla con registros del período
- Link a vista tabla filtrada

### 3.4 Pagination

**Ubicación:** `components/ui/pagination.tsx` (nuevo)

```tsx
interface PaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

// UI: ‹ Anterior  |  1  2  3  ...  18  |  Siguiente ›
// Info: "Mostrando 1-20 de 347"
```

### 3.5 DateRangePicker

**Ubicación:** `components/ui/date-range-picker.tsx` (nuevo)

```tsx
interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onChange: (start: Date | null, end: Date | null) => void
  presets?: { label: string; days: number }[]
}

// Presets: "Hoy", "Últimos 7 días", "Este mes", "Mes anterior", "Custom"
```

### 3.6 Table Component (UI Base)

**Ubicación:** `components/ui/table.tsx` (nuevo)

```tsx
// Componentes:
export function Table({ children, className })
export function TableHeader({ children, className })
export function TableBody({ children, className })
export function TableRow({ children, className })
export function TableHead({ children, className })
export function TableCell({ children, className })
export function TableCaption({ children, className })
```

---

## 4. Especificación de API

### 4.1 Endpoint Actual: `GET /api/admin/logs`

**Params actuales:**
```
?dateFilter=all|today|week|month
?employeeFilter=<user_id>
?limit=500
?offset=0
```

**Nuevos params:**
```
?dateFilter=all  (deprecated, usar startDate/endDate)
?startDate=2024-01-01       // YYYY-MM-DD
?endDate=2024-01-31         // YYYY-MM-DD
?search=texto               // Búsqueda server-side
?page=1                     // Página actual
?pageSize=20                // Items por página
```

**Respuesta actualizada:**
```json
{
  "logs": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 347,
    "totalPages": 18
  },
  "aggregations": {
    "byEmployee": [
      {
        "user_id": "uuid",
        "full_name": "Juan Pérez",
        "total_hours": 176.5,
        "record_count": 22,
        "average_hours": 8.02
      }
    ]
  }
}
```

### 4.2 Nuevo Endpoint: `GET /api/admin/logs/aggregations`

Para alimentar las Cards sin cargar todos los registros.

```json
{
  "employees": [
    {
      "user_id": "uuid",
      "full_name": "Juan Pérez",
      "email": "juan@email.com",
      "avatar_url": null,
      "stats": {
        "total_hours": 176.5,
        "record_count": 22,
        "average_hours": 8.02,
        "compliance_percent": 100
      }
    }
  ]
}
```

---

## 5. Estructura de Archivos

```
app/(dashboard)/admin/logs/
├── page.tsx                    # Main page (actual)
├── components/
│   ├── logs-header.tsx         # Header con filtros
│   ├── view-toggle.tsx         # Cards/Table tabs
│   ├── cards-view.tsx          # Vista cards
│   ├── employee-card.tsx       # Card individual
│   ├── employee-sheet.tsx      # Sheet drill-down
│   └── table-view.tsx          # Vista tabla mejorada
│
components/ui/
├── table.tsx                   # NUEVO: Table components
├── pagination.tsx              # NUEVO: Pagination
├── date-range-picker.tsx       # NUEVO: Date range selector
├── select.tsx                  # NUEVO: Select component
└── badge.tsx                  # Existe, verificar uso

lib/
├── actions/
│   └── time-log.ts            # Agregar función getLogsAggregations
└── utils/
    └── formatting.ts          # Verificar funciones existentes

app/api/admin/logs/
├── route.ts                   # Actualizar para pagination + aggregations
└── aggregations/route.ts      # NUEVO: Endpoint para stats de empleados
```

---

## 6. Fases de Implementación

### Fase 1: Componentes UI Base (4h)

| Componente | Archivo | Tarea |
|------------|---------|-------|
| `Table` | `components/ui/table.tsx` | Crear Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| `Pagination` | `components/ui/pagination.tsx` | Botones + info de página |
| `DateRangePicker` | `components/ui/date-range-picker.tsx` | Inputs + presets |
| `Select` | `components/ui/select.tsx` | Wrapper del native select con estilos |

### Fase 2: API Enhancements (4h)

| Cambio | Descripción |
|--------|-------------|
| Pagination | Agregar `page` y `pageSize` params, retornar `totalPages` |
| Date Range | Reemplazar `dateFilter` con `startDate`/`endDate` |
| Search | Migrar de client-side filtering a query param `search` |
| Aggregations | Nuevo endpoint `GET /api/admin/logs/aggregations` |

### Fase 3: Vista Cards (4h)

| Componente | Descripción |
|------------|-------------|
| `ViewToggle` | Tabs para alternar entre Cards y Table |
| `CardsView` | Grid responsivo de EmployeeCards |
| `EmployeeCard` | Card con stats mínimos y progress bar |
| `EmployeeSheet` | Panel lateral con detalle del empleado |

### Fase 4: Refactorización Tabla (3h)

| Mejora | Descripción |
|--------|-------------|
| Usar `Table` components | Reemplazar `<table>` HTML nativo |
| Paginación real | Integrar componente Pagination |
| Rango de fechas | Integrar DateRangePicker |
| Memoización | `React.memo` en filas de tabla |

### Fase 5: Integración y Testing (3h)

| Tarea | Descripción |
|-------|-------------|
| URL sync | Mantener `?view=` y `?page=` en URL |
| Filtros compartidos | Asegurar que filtros aplican a ambas vistas |
| Responsive | Cards y Table deben funcionar en mobile |
| Testing manual | Verificar todos los flujos |

---

## 7. Decisiones de Diseño

### 7.1 Por qué Cards como vista alternativa?

- **Overview instantáneo**: El admin ve quién está cumpliendo sinscrollear tablas
- **Progress bar visual**: Comunica cumplimiento vs meta de 8h/día de un vistazo
- **Click para detalle**: El Sheet mantiene contexto sin perder la vista general
- **Mobile-friendly**: Cards apilan naturalmente en pantallas pequeñas

### 7.2 Por qué Sheet en lugar de Modal?

- **No bloquea la vista principal**: El admin puede ver las otras cards mientras tiene el sheet abierto
- **Más espacio**: Para mostrar registros detallados
- **Cierre rápido**: Click fuera o botón cierra el sheet

### 7.3 Por qué paginación en lugar de infinite scroll?

- **Predictibilidad**: El admin sabe cuántos registros hay y en qué página está
- **Navegación rápida**: Ir a página 5 directamente es más fácil que scroll
- **Server-side**: Menos carga en el cliente con muchos registros

---

## 8. Métricas de Éxito

| Métrica | Target |
|---------|--------|
| Tiempo para ver stats de empleado | < 2 segundos |
| Registros visibles sin scroll | 20 por página |
| Cards en viewport (desktop) | 6-9 cards |
| Tiempo de carga inicial | < 1.5 segundos |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| API lenta con aggregations | Media | Alta | Cachear resultados, lazy load |
| Demasiado estado en URL | Baja | Baja | Pocos params, valores por defecto claros |
| Cards no intuitivas para algunos | Baja | Media | Mantener tabla como default inicialmente |

---

## 10. Checklist de Implementación

- [ ] Crear `components/ui/table.tsx`
- [ ] Crear `components/ui/pagination.tsx`
- [ ] Crear `components/ui/date-range-picker.tsx`
- [ ] Crear `components/ui/select.tsx`
- [ ] Actualizar API para paginación
- [ ] Actualizar API para date range
- [ ] Agregar endpoint aggregations
- [ ] Crear `ViewToggle` component
- [ ] Crear `CardsView` component
- [ ] Crear `EmployeeCard` component
- [ ] Crear `EmployeeSheet` component
- [ ] Refactorizar tabla existente
- [ ] Integrar paginación
- [ ] Integrar date range picker
- [ ] Testing manual
- [ ] Validar responsive
