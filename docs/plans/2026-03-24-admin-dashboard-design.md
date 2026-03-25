# Dashboard Admin - Control de Asistencia Diario

**Fecha:** 2026-03-24  
**Estado:** Validado  
**Autor:** Design Session

---

## Resumen

Dashboard admin convertido en aplicación funcional de control de asistencia diario, minimizando necesidad de navegar a otras secciones.

## Objetivos

- Stats claros y accionables (3 métricas)
- Tabla mínima pero funcional
- Clock in/out masivo eficiente
- Configuración de grupos y horarios accesible

---

## 1. Stats Cards

| Stat | Descripción | Implementación |
|------|-------------|----------------|
| **Activos** | Empleados con registro hoy | Count con badge verde |
| **Inactivos** | Empleados sin registro hoy | Count con badge rojo |
| **Total Horas Hoy** | Suma de horas registradas | Número + "hrs" |

---

## 2. Header del Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                    [Config] [+ Ingreso Masivo] │
│                               ⚙️           🚀              │
└─────────────────────────────────────────────────────────────┘
```

- **Config (⚙️)**: Abre modal de configuración de grupos/horarios
- **Ingreso Masivo (🚀)**: Abre modal de clock masivo

---

## 3. Filtros

```
[Todos] [Activos] [Inactivos]     [🔍 Buscar por nombre...]
```

---

## 4. Tabla Principal

| Nombre | Status | Entrada | Salida | Total | Acciones |
|--------|--------|---------|--------|-------|----------|
| Juan Pérez | Activo | 9:00 | 18:00 | 9h | 🕐 🕐 ✏️ |
| María López | Inactivo | - | - | - | 🕐 🕐 ✏️ |

**Acciones (iconos con tooltip):**
- 🕐 Clock In
- 🕐 Clock Out
- ✏️ Editar registro

---

## 5. Modal "Ingreso Masivo"

**Trigger:** Botón "Ingreso Masivo" en header

**Campos:**
- Fecha (date picker, default hoy)
- Hora (time picker, default configurable o actual)
- Empleados (checkboxes, todos seleccionados por defecto)

**Comportamiento:**
- Click en "Marcar Entrada" registra esa hora para todos seleccionados

---

## 6. Modal "Configuración"

**Trigger:** Botón ⚙️ en header

**Tabs:**
1. Grupos - Lista de grupos con horarios
2. Agregar/Editar Grupo

**Estructura Grupo:**
- Nombre (ej: "Mañana")
- Hora ingreso (ej: 9:00)
- Hora salida (ej: 18:00)

---

## 7. Modal "Clock Individual"

**Trigger:** Click en icono 🕐 de Clock In/Out

**Campos:**
- Checkbox "Usar fecha y hora actual"
- Si no: Fecha + Hora editables

---

## 8. Modal "Editar Registro"

**Trigger:** Click en icono ✏️

**Campos:**
- Fecha
- Entrada
- Salida
- Notas

**Acciones:**
- Eliminar registro
- Guardar cambios

---

## 9. Arquitectura de Datos

### Nueva Tabla: `work_groups`

```sql
CREATE TABLE work_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  clock_in_time TIME NOT NULL,
  clock_out_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modificación: `profiles`

```sql
ALTER TABLE profiles ADD COLUMN work_group_id UUID REFERENCES work_groups(id);
```

---

## 10. API Endpoints

### Grupos
- `GET /api/admin/work-groups` - Listar grupos
- `POST /api/admin/work-groups` - Crear grupo
- `PUT /api/admin/work-groups/[id]` - Actualizar grupo
- `DELETE /api/admin/work-groups/[id]` - Eliminar grupo

### Logs
- `POST /api/admin/logs/bulk` - Bulk clock in/out

---

## 11. Implementación - Orden

1. [ ] Nuevo componente `AdminDashboardClient` (refactorizado)
2. [ ] Stats cards con datos reales
3. [ ] Header con botones
4. [ ] Tabla simplificada
5. [ ] Modal Ingreso Masivo
6. [ ] Modal Configuración Grupos
7. [ ] Modal Clock Individual
8. [ ] Modal Editar Registro
9. [ ] API work-groups
10. [ ] API bulk clock
11. [ ] Migración database

---

## 12. Métricas de Éxito

- Admin puede hacer clock in/out de cualquier empleado en < 3 clicks
- Configuración de grupos accesible en < 2 clicks
- Stats actualizados en tiempo real después de acciones
- Sin necesidad de navegar a otras secciones para tareas diarias
