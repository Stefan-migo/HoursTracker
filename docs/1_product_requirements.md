# Product Requirements Document (PRD)
## HoursTracker - Sistema de Registro de Horas de Empleados

---

## 1. Visión General del Producto

### 1.1 Descripción
**HoursTracker** es una aplicación web minimalista diseñada para el registro y gestión de horas laborales de empleados. La aplicación permite a los empleados marcar su entrada y salida de manera sencilla, mientras que el departamento de RRHH puede gestionar y supervisar los registros de todo el personal, incluyendo importación masiva desde archivos Excel.

### 1.2 Propósito
- Eliminar el uso de hojas de cálculo manuales para el control de asistencia
- Centralizar los registros de horas en una base de datos unificada
- Proporcionar una experiencia de usuario sin fricción para empleados
- Permitir importación masiva de datos históricos desde Excel

### 1.3 Alcance
- Aplicación web responsive (desktop y móvil)
- Autenticación segura con Supabase Auth
- Almacenamiento persistente en Supabase Database
- Importación de datos desde archivos Excel (.xlsx, .xls, .csv)

---

## 2. Definición de Usuarios y Roles

### 2.1 Rol: Empleado

#### Responsabilidades
- Registrar su hora de entrada al iniciar jornada laboral
- Registrar su hora de salida al finalizar jornada laboral
- Visualizar su historial personal de registros

#### Permisos
- CRUD sobre sus propios time_logs
- Lectura de su propio historial
- No puede ver registros de otros empleados
- No puede importar datos

#### Flujo de Usuario (Empleado)
```
1. Login con credenciales corporativas
2. Vista principal con estado actual (Fuera/Hoy fue: HH:MM)
3. [Marcar Entrada] → Registra timestamp actual
4. [Marcar Salida] → Calcula horas trabajadas y guarda
5. Historial → Lista de registros personales
```

---

### 2.2 Rol: Administrador (RRHH)

#### Responsabilidades
- Supervisar los registros de horas de todos los empleados
- Importar datos históricos desde archivos Excel
- Gestionar usuarios y perfiles

#### Permisos
- Lectura de todos los time_logs de todos los usuarios
- Creación masiva de time_logs via importación Excel
- Gestión de perfiles de usuarios
- Acceso al dashboard global

#### Flujo de Usuario (RRHH)
```
1. Login con credenciales de administrador
2. Dashboard global con resumen de horas por empleado
3. Vista de tabla con todos los registros
4. [Importar Excel] → Seleccionar archivo → Mapeo automático → Confirmar → Bulk insert
5. Gestión de usuarios y roles
```

---

## 3. Funcionalidades Específicas

### 3.1 Funcionalidades del Empleado

#### 3.1.1 Autenticación
- Login con email y contraseña
- Gestión de sesión persistente
- Logout seguro
- Redirección automática según rol

#### 3.1.2 Marcar Entrada
- Botón grande y prominente "Marcar Entrada"
- Registra timestamp actual (fecha + hora)
- Validación: No permitir marcar entrada si ya existe una entrada sin salida
- Feedback visual: Confirmación de registro exitoso
- Estado: Botón deshabilitado si ya hay entrada sin salida

#### 3.1.3 Marcar Salida
- Botón grande y prominente "Marcar Salida"
- Registra timestamp actual
- Cálculo automático de horas trabajadas
- Validación: Solo aparece si existe entrada sin salida del día
- Feedback visual: Muestra total de horas trabajadas

#### 3.1.4 Historial Personal
- Lista de registros ordenados por fecha (más reciente primero)
- Muestra: Fecha, Hora Entrada, Hora Salida, Total Horas
- Formato de hora legible (ej: "09:00", "18:30")
- Paginación para grandes volúmenes de datos
- Filtro por rango de fechas

#### 3.1.5 Comparación de Registros
- Comparación visual entre registros oficiales y del sistema
- Identificación automática de discrepancias
- Muestra: Fecha, Registro Oficial, Registro Sistema, Diferencia
- Indicadores visuales (verde/amarillo/rojo) según coincidencia
- Capacidad de crear disputa directamente desde la comparación

#### 3.1.6 Sistema de Disputas
- Crear disputa por discrepancia en registro
- Campos: Fecha afectada, Tipo (entrada/salida), Descripción, Evidencia opcional
- Estados: Pendiente, En revisión, Resuelta, Rechazada
- Historial de disputas con respuestas del administrador
- Notificaciones de cambios de estado

---

### 3.2 Funcionalidades del Administrador (RRHH)

#### 3.2.1 Dashboard Global
- Resumen de horas por empleado (semana actual)
- Total de horas trabajadas por empleado
- Contador de días trabajados
- Indicadores visuales (semáforo) para horas insuficientes/excesivas

#### 3.2.2 Tabla de Registros Global
- Vista tipo tabla con todos los registros
- Columnas: Empleado, Email, Fecha, Entrada, Salida, Total
- Ordenable por cualquier columna
- Filtrable por empleado, rango de fechas
- Exportación a CSV/Excel (opcional)

#### 3.2.3 Importación de Excel (Funcionalidad Crítica)

**Objetivo**: Importar datos históricos desde un archivo Excel proporcionado por RRHH.

**Formato Esperado del Excel**:
| Email | Fecha | Hora Entrada | Hora Salida |
|-------|-------|--------------|-------------|
| juan@empresa.com | 2024-01-15 | 09:00 | 18:00 |
| maria@empresa.com | 2024-01-15 | 08:30 | 17:30 |

**Pasos del Flujo de Importación**:
1. **Subir archivo**: Drag & drop o selector de archivos
2. **Lectura y parseo**: Usar SheetJS (xlsx) para leer en el navegador
3. **Validación de columnas**: Verificar que existan Email, Fecha, Hora Entrada, Hora Salida
4. **Mapeo de datos**: Convertir formato Excel a registros de base de datos
5. **Validación de registros**:
   - Verificar que el email exista en profiles
   - Validar formato de fecha (YYYY-MM-DD)
   - Validar formato de hora (HH:MM)
   - Verificar que hora salida > hora entrada
6. **Preview**: Mostrar tabla con los datos a importar
7. **Confirmar**: Botón para ejecutar bulk insert
8. **Resultado**: Mostrar X registros importados exitosamente, Y errores

**Validaciones Específicas**:
- Ignorar filas vacías
- Normalizar formatos de fecha (aceptar DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
- Normalizar formatos de hora (aceptar H:MM, HH:MM, HH:MM:SS)
- Manejar emails no encontrados (mostrar warning, no fallar todo el proceso)
- Detectar duplicados (misma fecha + email, skip)

#### 3.2.4 Gestión de Usuarios
- Lista de empleados registrados con estado (activo/inactivo)
- Verificación de emails en el sistema
- Asignación de roles (empleado/admin)
- Activar/desactivar cuentas de empleados
- Ver perfil detallado de cada empleado

#### 3.2.5 Invitación de Empleados por Email
- Formulario para invitar nuevos empleados
- Campos: Email, Nombre completo, Opción de enviar email
- Envío automático de invitación con enlace seguro
- Opción de crear con contraseña temporal (para testing)
- Confirmación de envío y estado de invitación
- El empleado recibe email con enlace para configurar contraseña

#### 3.2.6 Análisis AI de Excel
- Procesamiento inteligente de archivos Excel complejos
- Detección automática de formato y columnas
- Identificación de discrepancias entre registros
- Sugerencias de correcciones automáticas
- Reporte detallado con análisis de patrones
- Recomendaciones basadas en datos históricos

#### 3.2.7 Gestión de Disputas (Admin)
- Lista de todas las disputas con filtros (estado, empleado, fecha)
- Vista detallada de cada disputa
- Acciones: Aprobar, Rechazar, Solicitar más información
- Agregar comentarios y justificaciones
- Notificación automática al empleado del resultado
- Historial de resoluciones

#### 3.2.8 Comparación de Registros (Admin)
- Comparación masiva de registros oficiales vs sistema
- Detección automática de discrepancias
- Exportación de reporte de diferencias
- Acciones bulk sobre discrepancias
- Filtros por fecha, empleado, tipo de diferencia

---

## 4. Requisitos No Funcionales

### 4.1 Performance
- Tiempo de carga inicial < 3 segundos
- Respuesta de acciones de usuario < 500ms
- Importación de Excel de 1000 filas < 10 segundos

### 4.2 Seguridad
- Contraseñas hasheadas (Supabase Auth)
- Row Level Security (RLS) activo en todas las tablas
- HTTPS obligatorio en producción
- Validación de inputs en cliente y servidor

### 4.3 Usabilidad
- Interfaz intuitiva y minimalista
- Feedback visual inmediato en todas las acciones
- Mensajes de error claros y accionables
- Diseño responsive (móvil y desktop)
- Accesibilidad (WCAG 2.1 nivel AA)

### 4.4 Compatibilidad
- Navegadores: Chrome, Firefox, Safari, Edge (versiones actuales)
- Formatos Excel: .xlsx, .xls, .csv

---

## 5. User Stories

### 5.1 Empleado
- **US01**: Como empleado, quiero marcar mi entrada con un clic para registrar cuando llego al trabajo
- **US02**: Como empleado, quiero marcar mi salida para registrar cuando me voy del trabajo
- **US03**: Como empleado, quiero ver mi historial para consultar mis horas registradas
- **US04**: Como empleado, quiero que el sistema me impida marcar doble entrada el mismo día
- **US09**: Como empleado, quiero comparar mis registros oficiales con los del sistema para verificar coincidencias
- **US10**: Como empleado, quiero crear una disputa cuando encuentre discrepancias en mis registros
- **US11**: Como empleado, quiero recibir notificaciones cuando mi disputa sea resuelta

### 5.2 Administrador RRHH
- **US05**: Como administrador, quiero importar datos desde Excel para migrar registros históricos
- **US06**: Como administrador, quiero ver todos los registros para supervisar la asistencia
- **US07**: Como administrador, quiero filtrar registros por empleado y fecha para facilitar auditorías
- **US08**: Como administrador, quiero ver un resumen semanal por empleado para evaluar productividad
- **US12**: Como administrador, quiero invitar a nuevos empleados por email para facilitar el onboarding
- **US13**: Como administrador, quiero usar análisis AI para procesar archivos Excel complejos automáticamente
- **US14**: Como administrador, quiero gestionar las disputas de empleados para resolver discrepancias
- **US15**: Como administrador, quiero comparar registros oficiales con los del sistema para detectar errores
- **US16**: Como administrador, quiero activar/desactivar cuentas de empleados para gestionar accesos

---

## 6. Criterios de Aceptación

### 6.1 Empleado
- [x] Puede iniciar sesión con email y contraseña
- [x] Ve un botón "Marcar Entrada" prominente cuando no hay registro del día
- [x] Ve un botón "Marcar Salida" prominente cuando hay entrada sin salida
- [x] El sistema calcula automáticamente las horas trabajadas
- [x] Puede ver su historial con paginación
- [x] No puede ver registros de otros empleados
- [x] Puede comparar registros oficiales con los del sistema
- [x] Puede crear disputas por discrepancias
- [x] Recibe notificaciones de resolución de disputas

### 6.2 Administrador
- [x] Puede iniciar sesión con credenciales de admin
- [x] Ve un dashboard con resumen de horas por empleado
- [x] Ve una tabla con todos los registros globales
- [x] Puede subir un archivo Excel y ver preview de datos
- [x] Puede importar datos con confirmación
- [x] Ve reporte de errores en importación
- [x] Puede invitar empleados por email
- [x] Puede usar análisis AI para procesar Excel
- [x] Puede gestionar disputas de empleados
- [x] Puede comparar registros oficiales vs sistema
- [x] Puede activar/desactivar cuentas de empleados

---

## 7. Future Enhancements (Out of Scope para MVP)

### 7.1 Implementadas en Versión Actual ✅
Las siguientes features estaban originalmente fuera del scope pero han sido implementadas:
- ✅ Sistema de disputas para gestionar discrepancias
- ✅ Comparación de registros oficiales vs sistema
- ✅ Invitaciones de empleados por email
- ✅ Análisis AI de archivos Excel
- ✅ Gestión completa de empleados (activar/desactivar)

### 7.2 Planificadas para Futuras Versiones
- Reportes y gráficos de horas avanzados
- Alertas configurables de horas extra
- Integración con calendarios externos (Google Calendar, Outlook)
- App móvil nativa (iOS/Android)
- Notificaciones push en tiempo real
- Exportación de reportes en PDF
- API pública documentada
- Soporte multi-tenant
- Integración con sistemas de nómina
- Geolocalización para marcar entrada/salida
- Firma digital de registros

---

*Documento actualizado: Marzo 2026*
*Estado: Features implementadas marcadas con [x]*
