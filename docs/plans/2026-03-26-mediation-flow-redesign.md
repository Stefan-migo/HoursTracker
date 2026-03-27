# Diseño: Sistema de Mediación v2

## Problema Actual

El sistema de mediación actual tiene defectos críticos:
1. "Aceptar propuesta" no aplica los cambios a los time_logs
2. No hay cierre oficial - los cambios se pierden
3. UI confusa - el que propone también ve "Aceptar"
4. Historial no visible en tabla del worker

---

## Flujo Propuesto

### Estados de Mediación

```
pending_review → in_discussion → agreement_reached → resolved
                 ↓
           closed_no_changes
```

| Estado | Descripción |
|--------|-------------|
| `pending_review` | Esperando primera acción |
| `in_discussion` | Hay propuesta o contropropuesta activa |
| `agreement_reached` | Una parte aceptó, esperando confirmación de la otra |
| `resolved` | **Cierre oficial** - cambios aplicados |
| `closed_no_changes` | Cerrado sin aplicar cambios |

---

## Arquitectura de Datos

### Tabla `mediations` - Cambios

```sql
-- Ya existe la estructura base, solo necesitamos:
-- 1. Cuando status = 'resolved', aplicar valores propuestos automáticamente
-- 2. Campo para tracking de quién propuso qué

-- Nuevo flujo en PUT /api/mediations/[id]:
-- action 'accept':
--   1. Verificar que hay propuesta pendiente (proposed_by != user.id)
--   2. Aplicar proposed_clock_in/out a ambos time_logs
--   3. Marcar status = 'resolved'
--   4. Guardar resolved_at, resolved_by
```

### Toggle de Mediación

Opción A: En tabla `profiles` (por admin):
```sql
ALTER TABLE profiles ADD COLUMN mediations_enabled BOOLEAN DEFAULT true;
```

Opción B: Setting global en nueva tabla `settings`:
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ
);
-- { "mediations_enabled": true }
```

**Recomendación**: Opción B - más extensible para futuros settings.

---

## Lógica de UI

### Permisosmejorados

```typescript
permissions: {
  // ... existing
  can_accept_proposal: mediation.proposed_by !== null && mediation.proposed_by !== user.id,
  can_counter_proposal: mediation.proposed_by !== null,
  can_propose: mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes',
  i_proposed: mediation.proposed_by === user.id,
  i_countered: mediation.counter_by === user.id,
}
```

### Vista del que creó la propuesta

- **NO ve** botón "Aceptar Propuesta"
- Ve mensaje: "Esperando confirmación de [nombre de la otra parte]"
- Puede hacer contra-propuesta

### Vista del que recibe la propuesta

- Ve horas propuestas en card destacado
- **SÍ ve** botón "Aceptar Propuesta"
- Puede: Aceptar, Contraproponer, o Chat

### Historial (resolved/closed_no_changes)

- Tab separada "Historial" en ambas vistas
- Solo lectura
- Muestra resultado final (horas aplicadas o "cerrado sin cambios")

---

## Cambios en Componentes

### `MediationWorkspace`

1. Separar lógica de "Propuesta activa" vs "Resultado final"
2.贺卡 Mostrar "Esperando..." si `i_proposed`
3.贺卡 Botón "Aceptar Propuesta" solo si `can_accept_proposal`
4. Cuando `status === 'resolved'`:贺卡贺卡
   - Mostrar horas aplicadas贺卡
   -贺卡 "Resuelto el [fecha] por [nombre]"
   - Sin acciones editables

### `MediationCard`

- En historial: texto "Resuelto" o "Cerrado sin cambios"
- Sin botones de acción

### Worker Disputes Page

- Agregar tab "Historial"
- Filtro por `resolved` + `closed_no_changes`

---

## API Changes

### PUT `/api/mediations/[id]` - action `accept`

```typescript
case 'accept':
  // Validar que hay propuesta y no es del usuario actual
  if (!mediation.proposed_by || mediation.proposed_by === user.id) {
    return NextResponse.json({ error: 'No hay propuesta para aceptar' }, { 400 })
  }

  //贺卡贺卡贺卡 Aplicar cambios a AMBOS time_logs贺卡贺卡
  const clockIn = mediation.proposed_clock_in
  const clockOut = mediation.proposed_clock_out
  const totalHours = mediation.proposed_total_hours

  if (mediation.admin_time_log_id) {
    await supabase.from('time_logs').update({
      clock_in: clockIn,
      clock_out: clockOut,
      total_hours: totalHours,
      edited_by: user.id,
      edited_at: now,
      edit_reason: 'Mediación resuelta - acuerdo mutuo'
    }).eq('id', mediation.admin_time_log_id)
  }

  if (mediation.employee_time_log_id) {
    await supabase.from('time_logs').update({
      clock_in: clockIn,
      clock_out: clockOut,
      total_hours: totalHours,
      edited_by: user.id,
      edited_at: now,
      edit_reason: 'Mediación resuelta - acuerdo mutuo'
    }).eq('id', mediation.employee_time_log_id)
  }

  //贺卡贺卡贺卡贺卡贺卡贺卡 Actualizar mediacion贺卡贺卡贺卡贺卡
  updateData.status = 'resolved'
  updateData.resolved_at = now
  updateData.resolved_by = user.id
  updateData.resolution_notes = `Acuerdo alcanzado el ${new Date().toLocaleDateString('es-CL')}`
  break
```

---

## Pendiente: Toggle de Habilitación

1. Crear tabla `settings` con `mediations_enabled`
2.贺卡贺卡贺卡贺卡贺卡贺卡贺卡贺卡贺卡贺卡贺卡 Modificar trigger de mediación:
   ```sql
   -- En el trigger que crea mediaciones automáticamente
   -- Verificar settings.mediations_enabled antes de crear
   ```
3. O en el endpoint que crea la mediación verificar el setting

---

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `route.ts` | Fix `accept` para aplicar cambios y marcar `resolved` |
| `useMediations.ts` | Nuevos permisos `can_accept_proposal`, `i_proposed` |
| `mediation-workspace.tsx` | UI diferenciada por rol (propongo vs acepto) |
| `worker/disputes/page.tsx` | Tab Historial |
| `admin/disputes/page.tsx` | Tab Historial + toggle settings |
| `settings` table | Nuevo setting `mediations_enabled` |
| Trigger mediation | Respetar toggle |

---

## Preguntas Abiertas

1. ¿El toggle debería ser por empleado o global?
2. ¿El admin puede forzar resolución sin acuerdo? (actualmente `close` cierra sin cambios)
