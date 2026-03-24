# HoursTracker - Sistema de Gestión de Horas

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<p align="center">
  <b>Sistema web minimalista para el registro y gestión de horas laborales</b>
</p>

---

## 📋 Descripción

**HoursTracker** es una aplicación web moderna diseñada para la gestión eficiente de horas laborales. Permite a los empleados registrar su entrada y salida de manera sencilla, mientras que los administradores de RRHH pueden supervisar, gestionar y analizar los registros de todo el personal, incluyendo importación masiva desde archivos Excel.

### ✨ Características Principales

- **🕐 Registro de Horas**: Marcar entrada y salida con un solo clic
- **📊 Dashboard Administrativo**: Vista global de horas por empleado
- **📁 Importación Excel**: Carga masiva de datos históricos desde archivos .xlsx
- **🤖 Análisis AI**: Procesamiento inteligente de archivos Excel con IA
- **⚖️ Sistema de Disputas**: Gestión de discrepancias en registros
- **🔍 Comparación de Registros**: Comparación entre registros oficiales y del sistema
- **📧 Invitaciones por Email**: Envío de invitaciones a nuevos empleados
- **🌙 Modo Oscuro**: Soporte completo para dark mode
- **📱 Responsive**: Diseño adaptativo para móvil y desktop

---

## 🚀 Tecnologías

- **Framework**: [Next.js 16.2.1](https://nextjs.org/) (App Router)
- **Frontend**: [React 19.2.4](https://react.dev/)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Autenticación**: Supabase Auth
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Íconos**: [Lucide React](https://lucide.dev/)
- **Email**: [Resend](https://resend.com/)
- **Excel**: [SheetJS](https://sheetjs.com/)
- **Validación**: [Zod 4](https://zod.dev/)

---

## 📦 Requisitos Previos

- **Node.js** 20.x o superior
- **npm** 10.x o superior (o yarn/pnpm)
- **Cuenta de Supabase** (puede ser gratuita)
- (Opcional) **Cuenta de Resend** para envío de emails
- (Opcional) **API Key de AI** para análisis de Excel

---

## 🛠️ Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd hourstracker2
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
# Supabase Configuration (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Service (opcional, para invitaciones)
RESEND_API_KEY=re_xxxxxxxx

# AI Service (opcional, para análisis de Excel)
AI_API_KEY=sk-xxxxxxxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configurar Base de Datos

Ejecuta las migraciones SQL ubicadas en `/supabase/migrations/`:

1. Ve al [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a "SQL Editor" → "New Query"
4. Copia y ejecuta las migraciones en orden (001, 002, 003...)

### 5. Crear Usuario Administrador

1. Registra un usuario en Supabase Auth
2. Actualiza su rol a 'admin' en la tabla `profiles`:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@ejemplo.com';
```

### 6. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del Proyecto

```
hourstracker2/
├── app/
│   ├── (auth)/              # Rutas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Rutas protegidas del dashboard
│   │   ├── admin/           # Panel de administrador
│   │   │   ├── page.tsx     # Dashboard principal
│   │   │   ├── employees/   # Gestión de empleados
│   │   │   ├── logs/        # Registros de tiempo
│   │   │   ├── import/      # Importación Excel
│   │   │   └── disputes/    # Gestión de disputas
│   │   └── employee/        # Panel de empleado
│   │       ├── page.tsx     # Dashboard
│   │       ├── history/     # Mi historial
│   │       ├── my-logs/     # Mis registros
│   │       └── comparison/  # Comparación de registros
│   ├── api/                 # API Routes
│   └── globals.css          # Estilos globales
├── components/
│   ├── ui/                  # Componentes base (shadcn/ui)
│   ├── layout/              # Componentes de layout
│   └── features/            # Componentes específicos
├── docs/                    # Documentación del proyecto
│   ├── 1_product_requirements.md
│   ├── 2_tech_stack_and_architecture.md
│   ├── 3_database_schema.md
│   └── 4_master_plan.md
├── lib/
│   ├── actions/             # Server Actions
│   ├── supabase/            # Clientes y tipos de Supabase
│   └── utils.ts             # Utilidades
├── supabase/
│   └── migrations/          # Migraciones SQL
└── public/                  # Archivos estáticos
```

---

## 🧪 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Producción
npm run build           # Compila para producción
npm run start           # Inicia servidor de producción

# Calidad de Código
npm run lint            # Ejecuta ESLint
```

---

## 🎯 Roles y Funcionalidades

### 👤 Empleado

- ✅ Marcar entrada y salida
- ✅ Ver historial personal de registros
- ✅ Comparar registros oficiales vs sistema
- ✅ Crear disputas por discrepancias
- ✅ Ver dashboard personal con resumen semanal

### 👔 Administrador (RRHH)

- ✅ Dashboard global con estadísticas
- ✅ Ver todos los registros de empleados
- ✅ Importar datos desde Excel
- ✅ Análisis AI de archivos Excel
- ✅ Gestionar disputas de empleados
- ✅ Invitar nuevos empleados por email
- ✅ Gestionar empleados (activar/desactivar)

---

## 📚 Documentación

Para documentación técnica detallada, consulta los archivos en `/docs/`:

- **[1_product_requirements.md](./docs/1_product_requirements.md)** - Requisitos del producto
- **[2_tech_stack_and_architecture.md](./docs/2_tech_stack_and_architecture.md)** - Arquitectura técnica
- **[3_database_schema.md](./docs/3_database_schema.md)** - Esquema de base de datos
- **[4_master_plan.md](./docs/4_master_plan.md)** - Plan de desarrollo
- **[API.md](./docs/API.md)** - Documentación de endpoints

---

## 🎨 Sistema de Diseño

El proyecto sigue un sistema de diseño minimalista inspirado en macOS y ChatGPT:

- **Colores**: Paleta verde "Forest Trust" con soporte dark mode
- **Tipografía**: Geist (system-ui fallback)
- **Espaciado**: Grid de 8px
- **Bordes**: Radio consistente (6px-20px)
- **Animaciones**: Transiciones suaves (200ms)

Más detalles en [AGENTS.md](./AGENTS.md)

---

## 🚀 Despliegue

### Vercel (Recomendado)

1. Importa tu repositorio en [Vercel](https://vercel.com)
2. Configura las variables de entorno en el dashboard
3. ¡Listo! Vercel se encargará del build y despliegue

Para instrucciones detalladas, consulta [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto es privado y propiedad de sus respectivos dueños.

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) por el framework
- [Supabase](https://supabase.com/) por el backend
- [Vercel](https://vercel.com/) por el hosting
- [Radix UI](https://www.radix-ui.com/) por los componentes accesibles

---

## 📞 Soporte

Para preguntas o problemas:

1. Revisa la [documentación](./docs/)
2. Consulta [AGENTS.md](./AGENTS.md) para guías de desarrollo
3. Abre un issue en el repositorio

---

<p align="center">
  Hecho con ❤️ para gestionar horas de manera eficiente
</p>
