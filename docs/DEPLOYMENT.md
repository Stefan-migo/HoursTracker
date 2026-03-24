# Deployment Guide
## HoursTracker - Guía de Despliegue

---

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Preparación del Proyecto](#preparación-del-proyecto)
3. [Despliegue en Vercel](#despliegue-en-vercel-recomendado)
4. [Configuración de Supabase](#configuración-de-supabase)
5. [Variables de Entorno](#variables-de-entorno)
6. [Configuración de Email (Opcional)](#configuración-de-email-opcional)
7. [Configuración de AI (Opcional)](#configuración-de-ai-opcional)
8. [Verificación Post-Despliegue](#verificación-post-despliegue)
9. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

Antes de comenzar el despliegue, asegúrate de tener:

- [ ] **Cuenta de GitHub** con el código del proyecto
- [ ] **Cuenta de Vercel** (gratuita en [vercel.com](https://vercel.com))
- [ ] **Cuenta de Supabase** (gratuita en [supabase.com](https://supabase.com))
- [ ] **Node.js 20+** instalado localmente
- [ ] (Opcional) **Cuenta de Resend** para emails
- [ ] (Opcional) **API Key de OpenRouter** para análisis AI

---

## Preparación del Proyecto

### 1. Verificar Build Local

Antes de desplegar, asegúrate de que el proyecto compila localmente:

```bash
# Instalar dependencias
npm install

# Ejecutar build de producción
npm run build
```

Si el build falla, corrige los errores antes de continuar.

### 2. Verificar Linting

```bash
npm run lint
```

### 3. Preparar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Completa los valores necesarios (ver sección [Variables de Entorno](#variables-de-entorno)).

---

## Despliegue en Vercel (Recomendado)

### Paso 1: Importar Proyecto

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. Selecciona el repositorio `hourstracker2`

### Paso 2: Configurar Proyecto

**Configuración del Framework:**
- **Framework Preset**: Next.js
- **Root Directory**: `./` (raíz del proyecto)
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `.next` (automático)

**Configuración de Node.js:**
- Ve a **Settings** → **General**
- **Node.js Version**: `20.x`

### Paso 3: Configurar Variables de Entorno

En la sección **Environment Variables**, agrega:

#### Obligatorias
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### Opcionales (Email)
```
RESEND_API_KEY=re_xxxxxxxx
```

#### Opcionales (AI)
```
AI_API_KEY=sk-xxxxxxxx
```

#### App
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

> **⚠️ IMPORTANTE**: Las variables que comienzan con `NEXT_PUBLIC_` están disponibles en el cliente. NUNCA expongas `SUPABASE_SERVICE_ROLE_KEY` sin el prefijo público.

### Paso 4: Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que el build termine (2-5 minutos)
3. Visita la URL proporcionada por Vercel

---

## Configuración de Supabase

### Paso 1: Crear Proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Anota el **Project URL** y las **API Keys**

### Paso 2: Ejecutar Migraciones

1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta
3. Ejecuta las migraciones en orden:

```sql
-- 001_create_tables.sql
-- 002_add_rls_policies.sql
-- 003_add_indexes.sql
-- etc.
```

Las migraciones están en `/supabase/migrations/`.

### Paso 3: Configurar Autenticación

1. Ve a **Authentication** → **Providers**
2. Asegúrate de que **Email** esté habilitado
3. Configuración recomendada:
   - **Confirm email**: Deshabilitado (para MVP)
   - **Enable Signup**: Habilitado

### Paso 4: Configurar URLs de Redirección

1. Ve a **Authentication** → **URL Configuration**
2. Agrega tu dominio de Vercel:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/**`

### Paso 5: Crear Usuario Administrador

1. Ve a **Authentication** → **Users**
2. Crea un nuevo usuario con email y contraseña
3. Ve a **Table Editor** → **profiles**
4. Encuentra el usuario creado y cambia `role` a `'admin'`

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@ejemplo.com';
```

---

## Variables de Entorno

### Descripción Completa

| Variable | Obligatoria | Descripción | Ubicación |
|----------|-------------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase | Cliente + Servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anónima de Supabase | Cliente + Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio (admin) | Solo Servidor |
| `RESEND_API_KEY` | No | API key de Resend para emails | Servidor |
| `AI_API_KEY` | No | API key para servicio de AI | Servidor |
| `NEXT_PUBLIC_APP_URL` | Sí | URL de la aplicación | Cliente |

### Entorno Local (.env.local)

```env
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Email (opcional)
RESEND_API_KEY=re_xxxxxxxx

# AI (opcional)
AI_API_KEY=sk-xxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Entorno de Producción (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## Configuración de Email (Opcional)

Si deseas enviar invitaciones por email, configura Resend:

### Paso 1: Crear Cuenta en Resend

1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta gratuita
3. Verifica tu dominio (o usa el dominio de prueba)

### Paso 2: Obtener API Key

1. Ve a **API Keys** en el dashboard de Resend
2. Crea una nueva API key
3. Copia la key (comienza con `re_`)

### Paso 3: Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega: `RESEND_API_KEY=re_xxxxxxxx`
4. Redespliega el proyecto

---

## Configuración de AI (Opcional)

Para habilitar el análisis AI de archivos Excel:

### Opción 1: OpenRouter

1. Ve a [openrouter.ai](https://openrouter.ai)
2. Crea una cuenta
3. Genera una API key
4. Configura en Vercel: `AI_API_KEY=sk-...`

### Opción 2: OpenAI

1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea una cuenta y genera API key
3. Modifica el código en `lib/ai/excel-agent.ts` para usar OpenAI

---

## Verificación Post-Despliegue

### Checklist de Verificación

#### Autenticación
- [ ] Puedes acceder a `/login`
- [ ] Puedes iniciar sesión con credenciales
- [ ] El login redirige correctamente según el rol
- [ ] Puedes cerrar sesión

#### Funcionalidad de Empleado
- [ ] Marcar entrada funciona
- [ ] Marcar salida funciona
- [ ] Historial se muestra correctamente
- [ ] Comparación de registros funciona
- [ ] Crear disputa funciona

#### Funcionalidad de Administrador
- [ ] Dashboard muestra estadísticas
- [ ] Lista de empleados visible
- [ ] Importación de Excel funciona
- [ ] Análisis AI funciona (si está configurado)
- [ ] Gestión de disputas funciona
- [ ] Invitar empleados funciona (si está configurado email)

#### Aspectos Técnicos
- [ ] No hay errores en la consola del navegador
- [ ] Dark mode funciona correctamente
- [ ] Responsive design funciona en móvil
- [ ] Las rutas protegidas redirigen correctamente

### Comandos de Verificación

```bash
# Verificar build
curl https://your-domain.vercel.app/api/health

# Verificar autenticación (debe redirigir a login)
curl -I https://your-domain.vercel.app/admin
```

---

## Troubleshooting

### Problema: Build falla en Vercel

**Síntomas**: El despliegue falla durante el build

**Soluciones**:
1. Verifica que `NODE_OPTIONS` no tenga valores conflictivos
2. Asegúrate de que todas las dependencias están en `package.json`
3. Verifica que no haya errores de TypeScript: `npm run build` localmente
4. Limpia el caché en Vercel: **Settings** → **Git** → **Clean Cache and Deploy**

### Problema: Error 500 al iniciar sesión

**Síntomas**: La página de login muestra error 500

**Soluciones**:
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` esté configurado
2. Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea correcto
3. Revisa los logs en Vercel: **Deployments** → **Latest** → **Logs**

### Problema: Row Level Security (RLS) bloquea consultas

**Síntomas**: Las tablas aparecen vacías o da error de permisos

**Soluciones**:
1. Verifica que las migraciones de RLS se ejecutaron
2. Revisa las políticas en Supabase: **Table Editor** → **Policies**
3. Asegúrate de que el usuario tenga el rol correcto en la tabla `profiles`

### Problema: Invitaciones por email no funcionan

**Síntomas**: Al invitar empleado, no se envía el email

**Soluciones**:
1. Verifica que `RESEND_API_KEY` esté configurado
2. Verifica que el dominio esté verificado en Resend
3. Revisa los logs de Vercel para ver errores de Resend

### Problema: Análisis AI no funciona

**Síntomas**: El análisis de Excel con AI da error

**Soluciones**:
1. Verifica que `AI_API_KEY` esté configurado
2. Verifica que la API key tenga saldo disponible
3. Revisa los logs para errores específicos de la API de AI

### Problema: Cookies no persisten

**Síntomas**: La sesión se pierde al recargar

**Soluciones**:
1. Verifica la configuración de dominios en Supabase Auth
2. Asegúrate de que las cookies estén configuradas correctamente en el middleware
3. Verifica que no haya conflictos con plugins de privacidad del navegador

---

## Comandos Útiles

### Redesplegar desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Redesplegar
vercel --prod
```

### Ver Logs en Tiempo Real

```bash
vercel logs --json
```

### Variables de Entorno desde CLI

```bash
# Agregar variable
vercel env add NEXT_PUBLIC_SUPABASE_URL

# Listar variables
vercel env ls

# Eliminar variable
vercel env rm NEXT_PUBLIC_SUPABASE_URL
```

---

## Recursos Adicionales

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)

---

## Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs de Vercel en tiempo real
2. Consulta la documentación de [Troubleshooting](#troubleshooting)
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de que las migraciones de Supabase se ejecutaron correctamente

---

*Guía actualizada: Marzo 2026*
