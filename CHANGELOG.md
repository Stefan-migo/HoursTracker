# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Sistema de disputas para gestionar discrepancias en registros
- Comparación de registros oficiales vs sistema
- Análisis AI de archivos Excel para importación inteligente
- Sistema de invitaciones por email para nuevos empleados
- Gestión completa de empleados (activar/desactivar)
- Documentación completa del API
- Documentación de despliegue

### Changed
- Actualización a Next.js 16.2.1
- Actualización a React 19.2.4
- Actualización a Tailwind CSS 4
- Actualización a Zod 4.3.6

---

## [0.1.0] - 2025-03-22

### Added

#### Core Features
- Sistema de autenticación con Supabase Auth
- Registro de entrada y salida para empleados
- Dashboard para empleados con resumen semanal
- Dashboard administrativo con estadísticas globales
- Historial personal de registros de tiempo
- Tabla global de registros para administradores
- Sistema de roles (admin/employee)
- Soporte para dark mode

#### Importación Excel
- Importación masiva desde archivos .xlsx, .xls, .csv
- Validación automática de columnas (Email, Fecha, Entrada, Salida)
- Normalización de formatos de fecha (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
- Normalización de formatos de hora (H:MM, HH:MM, HH:MM:SS)
- Preview de datos antes de importar
- Reporte de errores detallado
- Detección y manejo de duplicados

#### Base de Datos
- Esquema completo con PostgreSQL
- Row Level Security (RLS) activo en todas las tablas
- Triggers automáticos para timestamps
- Políticas de seguridad por rol
- Índices optimizados para consultas frecuentes

#### UI/UX
- Sistema de diseño minimalista estilo macOS/ChatGPT
- Componentes base con Radix UI
- Paleta de colores "Forest Trust"
- Tipografía Geist
- Animaciones y transiciones suaves
- Diseño responsive (móvil y desktop)
- Feedback visual con toasts (Sonner)

#### API Endpoints
- `/api/auth/setup-password` - Configuración de contraseña
- `/api/admin/invite` - Invitar empleados
- `/api/admin/invite-email` - Enviar emails de invitación
- `/api/admin/logs` - Gestión de registros
- `/api/admin/employees` - Gestión de empleados
- `/api/admin/import` - Importación Excel
- `/api/time-logs/clock-in` - Marcar entrada
- `/api/time-logs/clock-out` - Marcar salida
- `/api/time-logs/today` - Registro del día
- `/api/comparison` - Comparación de registros
- `/api/disputes` - Gestión de disputas
- `/api/ai/analyze-excel` - Análisis AI de Excel

#### Documentación
- Product Requirements Document (PRD)
- Documentación de arquitectura técnica
- Esquema completo de base de datos
- Plan maestro de desarrollo
- Plan de mejoras UI/UX
- AGENTS.md con guías para desarrolladores

### Technical

#### Stack Tecnológico
- Next.js 16.2.1 con App Router
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 4.x
- Supabase (Auth + Database)
- Zod 4.3.6 para validación
- date-fns para manejo de fechas
- SheetJS (xlsx) para Excel
- Resend para emails
- Radix UI para componentes
- Lucide React para íconos

#### Seguridad
- Autenticación JWT con Supabase
- Row Level Security en PostgreSQL
- Validación de inputs con Zod
- Sanitización de datos
- HTTPS en producción
- Protección contra CSRF

#### Performance
- Server Actions para operaciones de servidor
- Caché optimizado con Next.js
- Lazy loading de componentes
- Optimización de imágenes
- Bundle splitting automático

---

## [0.0.1] - 2025-01-XX

### Added
- Initial project setup with Next.js 14
- Basic project structure
- Tailwind CSS configuration
- Supabase integration setup

---

## Notas de Versión

### Convenciones de Versionado

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades manteniendo compatibilidad
- **PATCH**: Correcciones de bugs y mejoras menores

### Tags de Cambios

- `Added` - Nuevas funcionalidades
- `Changed` - Cambios en funcionalidades existentes
- `Deprecated` - Funcionalidades que serán removidas
- `Removed` - Funcionalidades eliminadas
- `Fixed` - Correcciones de bugs
- `Security` - Mejoras de seguridad

---

## Roadmap

### Próximas Versiones

#### [0.2.0] - Planned
- [ ] Reportes y gráficos de horas
- [ ] Exportación a PDF
- [ ] Alertas de horas extra configurables
- [ ] Integración con calendarios externos

#### [0.3.0] - Planned
- [ ] App móvil PWA
- [ ] Notificaciones push
- [ ] Recordatorios automáticos
- [ ] Reportes automáticos por email

#### [1.0.0] - Planned
- [ ] App móvil nativa (iOS/Android)
- [ ] Integración con sistemas de nómina
- [ ] API pública documentada
- [ ] Multi-tenant support

---

*Última actualización: 22 de marzo de 2026*
