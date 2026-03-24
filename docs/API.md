# API Documentation
## HoursTracker - Endpoints Reference

---

## Overview

Esta documentación describe todos los endpoints API disponibles en HoursTracker. Todos los endpoints requieren autenticación mediante JWT token de Supabase (excepto `/api/auth/setup-password`).

### Base URL
```
https://your-domain.com/api
```

### Autenticación

La mayoría de endpoints requieren un token JWT válido en las cookies. El token se obtiene al iniciar sesión mediante Supabase Auth y se maneja automáticamente por el middleware.

### Códigos de Respuesta

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 201 | Creado exitosamente |
| 400 | Solicitud inválida |
| 401 | No autenticado |
| 403 | No autorizado (permisos insuficientes) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

### Formato de Respuesta

Todas las respuestas son JSON con la siguiente estructura:

**Éxito:**
```json
{
  "data": { ... },
  "message": "Opcional: mensaje descriptivo"
}
```

**Error:**
```json
{
  "error": "Mensaje de error descriptivo"
}
```

---

## Endpoints de Autenticación

### POST `/api/auth/setup-password`
Configura la contraseña de un usuario invitado.

**No requiere autenticación**

#### Request Body
```json
{
  "invite_token": "string (base64 encoded)",
  "password": "string (mínimo 6 caracteres)"
}
```

#### Response 200
```json
{
  "success": true,
  "auto_login": true,
  "access_token": "jwt_token",
  "message": "Contraseña configurada. Iniciando sesión..."
}
```

#### Response 200 (sin auto-login)
```json
{
  "success": true,
  "auto_login": false,
  "message": "Contraseña configurada. Ahora puedes iniciar sesión."
}
```

#### Errores Comunes
- `400`: Token o contraseña faltantes
- `400`: Contraseña menor a 6 caracteres
- `400`: Token inválido o expirado
- `500`: Error al actualizar contraseña

---

## Endpoints de Administración

### POST `/api/admin/invite`
Invita a un nuevo empleado al sistema.

**Requiere rol: admin**

#### Request Body
```json
{
  "email": "string (email válido)",
  "full_name": "string",
  "send_email": "boolean (opcional, default: true)"
}
```

#### Response 200 (con email)
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "empleado@ejemplo.com",
    "full_name": "Nombre Empleado"
  },
  "message": "Se ha enviado una invitación por email al empleado. Recibirá un enlace para crear su contraseña."
}
```

#### Response 200 (sin email - contraseña temporal)
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "empleado@ejemplo.com",
    "full_name": "Nombre Empleado"
  },
  "temp_password": "AbCdEfGh1234",
  "message": "Empleado creado. Comparte esta contraseña temporal con Nombre Empleado: AbCdEfGh1234"
}
```

#### Errores Comunes
- `400`: Email o nombre faltantes
- `400`: Email ya registrado
- `401`: No autenticado
- `403`: No es administrador
- `500`: Error al crear usuario

---

### POST `/api/admin/invite-email`
Envía email de invitación a un empleado existente.

**Requiere rol: admin**

#### Request Body
```json
{
  "email": "string",
  "full_name": "string"
}
```

#### Response 200
```json
{
  "success": true,
  "message": "Invitación enviada exitosamente"
}
```

---

### GET `/api/admin/logs`
Obtiene todos los registros de tiempo (solo admin).

**Requiere rol: admin**

#### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| user_id | string (uuid) | Filtrar por empleado específico |
| date_from | string (YYYY-MM-DD) | Fecha inicial |
| date_to | string (YYYY-MM-DD) | Fecha final |
| limit | number | Límite de registros (default: 100) |
| offset | number | Offset para paginación |

#### Response 200
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "date": "2025-03-22",
    "clock_in": "2025-03-22T09:00:00",
    "clock_out": "2025-03-22T18:00:00",
    "total_hours": 9.0,
    "is_official": false,
    "employee": {
      "full_name": "Juan Pérez",
      "email": "juan@ejemplo.com"
    }
  }
]
```

---

### POST `/api/admin/import`
Importa registros de tiempo desde datos pre-procesados.

**Requiere rol: admin**

#### Request Body
```json
{
  "logs": [
    {
      "email": "empleado@ejemplo.com",
      "date": "2025-03-22",
      "clockIn": "09:00",
      "clockOut": "18:00"
    }
  ]
}
```

#### Response 200
```json
{
  "imported": 10,
  "failed": 2
}
```

#### Errores Comunes
- `400`: Datos inválidos o formato incorrecto
- `500`: Error de base de datos

---

### GET `/api/admin/employees`
Obtiene lista de empleados.

**Requiere rol: admin**

#### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | `active`, `inactive`, o `all` (default: all) |
| role | string | `admin`, `employee`, o `all` (default: all) |

#### Response 200
```json
[
  {
    "id": "uuid",
    "email": "empleado@ejemplo.com",
    "full_name": "Juan Pérez",
    "role": "employee",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

---

### PUT `/api/admin/employees`
Actualiza estado de un empleado.

**Requiere rol: admin**

#### Request Body
```json
{
  "user_id": "uuid",
  "is_active": "boolean",
  "role": "string (opcional)"
}
```

#### Response 200
```json
{
  "id": "uuid",
  "email": "empleado@ejemplo.com",
  "is_active": false,
  "role": "employee"
}
```

---

## Endpoints de Registros de Tiempo

### POST `/api/time-logs/clock-in`
Marca la entrada del empleado.

**Requiere autenticación**

#### Request Body (opcional)
```json
{
  "date": "2025-03-22 (opcional, default: hoy)",
  "clock_in": "2025-03-22T09:00:00 (opcional, default: ahora)"
}
```

#### Response 200
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2025-03-22",
  "clock_in": "2025-03-22T09:00:00",
  "is_official": false,
  "is_manual": false
}
```

#### Errores Comunes
- `400`: Ya existe entrada para esta fecha
- `403`: Cuenta inactiva

---

### POST `/api/time-logs/clock-out`
Marca la salida del empleado.

**Requiere autenticación**

#### Request Body (opcional)
```json
{
  "clock_out": "2025-03-22T18:00:00 (opcional, default: ahora)"
}
```

#### Response 200
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2025-03-22",
  "clock_in": "2025-03-22T09:00:00",
  "clock_out": "2025-03-22T18:00:00",
  "total_hours": 9.0,
  "is_official": false
}
```

#### Errores Comunes
- `400`: No hay entrada sin salida para hoy

---

### GET `/api/time-logs/today`
Obtiene el registro del día actual.

**Requiere autenticación**

#### Response 200 (con registro)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2025-03-22",
  "clock_in": "2025-03-22T09:00:00",
  "clock_out": null,
  "total_hours": null,
  "is_official": false
}
```

#### Response 200 (sin registro)
```json
null
```

---

### GET `/api/time-logs`
Obtiene historial de registros del usuario.

**Requiere autenticación**

#### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| date_from | string (YYYY-MM-DD) | Fecha inicial |
| date_to | string (YYYY-MM-DD) | Fecha final |
| limit | number | Límite de registros (default: 50) |
| offset | number | Offset para paginación |

#### Response 200
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2025-03-22",
      "clock_in": "2025-03-22T09:00:00",
      "clock_out": "2025-03-22T18:00:00",
      "total_hours": 9.0
    }
  ],
  "count": 100,
  "limit": 50,
  "offset": 0
}
```

---

## Endpoints de Comparación

### POST `/api/comparison`
Compara registros oficiales con los del sistema.

**Requiere autenticación**

#### Request Body
```json
{
  "date_from": "2025-03-01",
  "date_to": "2025-03-22",
  "user_id": "uuid (opcional, solo para admin)"
}
```

#### Response 200
```json
[
  {
    "date": "2025-03-22",
    "official": {
      "clock_in": "09:00",
      "clock_out": "18:00",
      "total_hours": 9.0
    },
    "system": {
      "clock_in": "09:05",
      "clock_out": "18:00",
      "total_hours": 8.92
    },
    "difference": {
      "clock_in_minutes": 5,
      "total_hours_diff": 0.08,
      "status": "minor" // exact, minor, major
    }
  }
]
```

---

## Endpoints de Disputas

### GET `/api/disputes`
Obtiene disputas.

**Requiere autenticación**

- **Empleado**: Solo ve sus propias disputas
- **Admin**: Ve todas las disputas (puede filtrar por status)

#### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | `pending`, `resolved`, `rejected` (solo admin) |

#### Response 200
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2025-03-22",
    "admin_clock_in": "09:00",
    "admin_clock_out": "18:00",
    "admin_total_hours": 9.0,
    "employee_clock_in": "08:30",
    "employee_clock_out": "18:00",
    "employee_total_hours": 9.5,
    "reason": "La hora de entrada fue 8:30, no 9:00",
    "status": "pending",
    "created_at": "2025-03-22T18:30:00Z",
    "employee": {
      "full_name": "Juan Pérez",
      "email": "juan@ejemplo.com"
    }
  }
]
```

---

### POST `/api/disputes`
Crea una nueva disputa.

**Requiere autenticación (solo empleados)**

#### Request Body
```json
{
  "date": "2025-03-22",
  "admin_clock_in": "09:00 (opcional)",
  "admin_clock_out": "18:00 (opcional)",
  "admin_total_hours": 9.0 (opcional),
  "employee_clock_in": "08:30",
  "employee_clock_out": "18:00",
  "employee_total_hours": 9.5,
  "reason": "string (descripción detallada)"
}
```

#### Response 200
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "date": "2025-03-22",
  "reason": "La hora de entrada fue 8:30, no 9:00",
  "status": "pending",
  "created_at": "2025-03-22T18:30:00Z"
}
```

#### Errores Comunes
- `400`: Fecha y motivo son requeridos
- `400`: Los registros son idénticos (no hay diferencia)
- `400`: Ya existe disputa pendiente para esta fecha

---

### PUT `/api/disputes`
Resuelve o rechaza una disputa.

**Requiere rol: admin**

#### Request Body
```json
{
  "id": "uuid",
  "status": "resolved | rejected",
  "resolution_notes": "string (opcional)"
}
```

#### Response 200
```json
{
  "id": "uuid",
  "status": "resolved",
  "resolution_notes": "Se verificó con cámaras de seguridad",
  "resolved_at": "2025-03-23T10:00:00Z"
}
```

---

## Endpoints de AI

### POST `/api/ai/analyze-excel`
Analiza un archivo Excel con inteligencia artificial.

**Requiere rol: admin**

#### Request Body (multipart/form-data)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| file | File | Archivo Excel (.xlsx, .xls, .csv) |
| use_ai | boolean | Usar análisis AI avanzado |

#### Response 200
```json
{
  "success": true,
  "analysis": {
    "total_rows": 100,
    "columns": ["Email", "Fecha", "Entrada", "Salida"],
    "valid_emails": 95,
    "invalid_emails": 5,
    "date_range": {
      "from": "2025-01-01",
      "to": "2025-03-22"
    },
    "errors": [
      {
        "row": 10,
        "column": "Email",
        "error": "Email inválido"
      }
    ]
  },
  "aiRecommendations": {
    "summary": "Se detectaron 5 registros con problemas...",
    "suggestions": [
      "Corregir emails en filas 10, 15, 23",
      "Verificar formato de fechas en fila 45"
    ],
    "patterns": [
      "Mayoría de registros son de horario diurno",
      "Se detectaron 3 empleados con horas extra frecuentes"
    ]
  }
}
```

#### Errores Comunes
- `400`: No se proporcionó archivo
- `400`: Tipo de archivo no válido
- `500`: Error al analizar archivo

---

## Ejemplos de Uso

### Marcar Entrada
```bash
curl -X POST https://api.hourstracker.com/api/time-logs/clock-in \
  -H "Content-Type: application/json" \
  --cookie "sb-access-token=YOUR_TOKEN"
```

### Importar Registros
```bash
curl -X POST https://api.hourstracker.com/api/admin/import \
  -H "Content-Type: application/json" \
  --cookie "sb-access-token=ADMIN_TOKEN" \
  -d '{
    "logs": [
      {
        "email": "juan@ejemplo.com",
        "date": "2025-03-22",
        "clockIn": "09:00",
        "clockOut": "18:00"
      }
    ]
  }'
```

### Crear Disputa
```bash
curl -X POST https://api.hourstracker.com/api/disputes \
  -H "Content-Type: application/json" \
  --cookie "sb-access-token=EMPLOYEE_TOKEN" \
  -d '{
    "date": "2025-03-22",
    "admin_clock_in": "09:00",
    "employee_clock_in": "08:30",
    "reason": "Llegué a las 8:30, el registro oficial está incorrecto"
  }'
```

---

## Notas Importantes

1. **Zona Horaria**: Todos los timestamps se almacenan en UTC y se convierten a la zona horaria local del cliente.

2. **Rate Limiting**: Los endpoints de importación tienen límites de tasa para prevenir abuso:
   - `/api/admin/import`: 10 requests/minuto
   - `/api/ai/analyze-excel`: 5 requests/minuto

3. **Validaciones**: Todos los inputs son validados con Zod antes de procesarse.

4. **Auditoría**: Las acciones importantes (crear disputa, importar datos) se registran automáticamente.

5. **Caché**: Algunos endpoints usan caché por 60 segundos para mejorar performance.

---

## Changelog de API

### v1.0.0 (Marzo 2026)
- Versión inicial de la API
- Todos los endpoints documentados
- Soporte para autenticación JWT

---

*Última actualización: 22 de marzo de 2026*
