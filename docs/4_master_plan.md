# Master Plan - Plan de Trabajo Detallado
## HoursTracker - Fases de Desarrollo

---

## Resumen de Fases

| Fase | Descripción | Duración Estimada |
|------|-------------|-------------------|
| 0 | Preparación y Configuración | 1-2 horas |
| 1 | Setup Inicial + Supabase Auth | 2-3 horas |
| 2 | Base de Datos y RLS | 2-3 horas |
| 3 | Vista Empleado | 3-4 horas |
| 4 | Vista Administrador (Dashboard + Tabla) | 3-4 horas |
| 5 | Importación Excel | 4-5 horas |
| 6 | Testing y Deployment | 2-3 horas |

**Total Estimado**: 17-24 horas de desarrollo

---

## Fase 0: Preparación y Configuración

### 0.1 Requisitos Previos
- [x] Node.js 18+ instalado
- [ ] Cuenta en Supabase (supabase.com)
- [ ] Git instalado y configurado
- [ ] Editor de código (VS Code recomendado)

### 0.2 Crear Proyecto Next.js
```bash
# Crear proyecto con Next.js 14
npx create-next-app@latest hours-tracker --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Entrar al directorio
cd hours-tracker

# Instalar dependencias adicionales
npm install @supabase/supabase-js @supabase/ssr xlsx date-fns zod lucide-react class-variance-authority clsx tailwind-merge

# Instalar tipos
npm install -D @types/node
```

### 0.3 Configurar Supabase
1. Crear proyecto en supabase.com
2. Obtener URL y Anon Key de Settings > API
3. Crear archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```
4. Configurar Authentication > Providers > Email (habilitar Password Auth)

### 0.4 Checklist de Verificación
- [ ] `npm run dev` inicia sin errores
- [ ] Variables de entorno cargadas
- [ ] Estructura de carpetas creada

---

## Fase 1: Setup Inicial e Integración con Supabase Auth

### 1.1 Crear Cliente Supabase

#### lib/supabase/client.ts
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### lib/supabase/server.ts
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
```

#### lib/supabase/middleware.ts
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

### 1.2 Crear Middleware de Rutas

#### middleware.ts (raíz del proyecto)
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 1.3 Crear Página de Login

#### app/(auth)/login/page.tsx
- Formulario con email y password
- Estado de loading durante autenticación
- Mensajes de error claros
- Redirección a dashboard tras login exitoso

### 1.4 Server Actions (Auth)

#### lib/actions/auth.ts
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
  }
  
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    return { error: error.message }
  }
  
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
```

### 1.5 Checklist de Verificación
- [ ] Login con credenciales funciona
- [ ] Sesión persiste entre páginas
- [ ] Middleware redirige a /login si no autenticado
- [ ] Logout funciona correctamente

---

## Fase 2: Creación de Tablas y RLS en Supabase

### 2.1 Ejecutar Migraciones

**Opción A: Via Supabase Dashboard (SQL Editor)**

Ejecutar el contenido de `docs/3_database_schema.md`:
1. Tabla profiles
2. Tabla time_logs
3. Índices
4. Triggers
5. Funciones helper
6. Políticas RLS

**Opción B: Via Supabase CLI**
```bash
npm install -g supabase
supabase login
supabase init
supabase migration new initial_schema
# Editar migration file y pegar SQL
supabase db reset
```

### 2.2 Checklist de Verificación
- [ ] Tabla profiles creada y funcional
- [ ] Tabla time_logs creada y funcional
- [ ] RLS habilitado en ambas tablas
- [ ] Políticas creadas (8 políticas mínimo)
- [ ] Trigger de auto-perfil funciona
- [ ] Nuevos usuarios obtienen perfil automáticamente

---

## Fase 3: Desarrollo de Vista Empleado

### 3.1 Layout del Dashboard

#### app/(dashboard)/layout.tsx
- Sidebar o header con navegación
- Menú según rol (empleado vs admin)
- Botón de logout
- Info de usuario logueado

### 3.2 Página Principal Empleado

#### app/(dashboard)/employee/page.tsx

**Componente: ClockCard**
```tsx
// Estado: Tiene entrada sin salida?
// - SÍ: Mostrar "Marcar Salida" (botón rojo/prominente)
// - NO: Mostrar "Marcar Entrada" (botón verde/prominente)
```

### 3.3 Server Actions para Reloj

#### lib/actions/time-log.ts
```typescript
'use server'

export async function markClockIn() {
  // Verificar entrada existente
  // Insertar nuevo registro
}

export async function markClockOut() {
  // Buscar entrada sin salida
  // Actualizar con clock_out
  // Calcular total_hours
}
```

### 3.4 Checklist de Verificación
- [ ] Empleado ve página principal tras login
- [ ] Botón "Marcar Entrada" funciona
- [ ] Botón "Marcar Salida" aparece tras entrada
- [ ] Total de horas se calcula automáticamente
- [ ] Empleado NO ve registros de otros

---

## Fase 4: Desarrollo de Vista Administrador

### 4.1 Dashboard de Resumen

#### app/(dashboard)/admin/page.tsx
- StatsCards con estadísticas
- EmployeeTable con resumen por empleado

### 4.2 Tabla Global de Registros

#### app/(dashboard)/admin/logs/page.tsx
- LogsTable con todos los registros
- Filtros por empleado y fecha

### 4.3 Checklist de Verificación
- [ ] Admin ve dashboard con resumen
- [ ] Tabla muestra todos los registros
- [ ] Filtros funcionan

---

## Fase 5: Desarrollo del Módulo de Importación Excel

### 5.1 Página de Importación

#### app/(dashboard)/admin/import/page.tsx
- DropZone para drag & drop
- FileInput como fallback
- PreviewTable con datos
- ImportButton

### 5.2 Librerías de Parseo

```bash
npm install xlsx
```

### 5.3 Checklist de Verificación
- [ ] Drag & drop funciona
- [ ] Preview muestra datos
- [ ] Bulk insert funciona
- [ ] Errores se reportan claramente

---

## Fase 6: Testing y Deployment

### 6.1 Testing Manual
- Login/logout
- Marcar entrada/salida
- Importar Excel
- Verificar RLS

### 6.2 Deployment a Vercel
```bash
npm i -g vercel
vercel
# Configurar variables de entorno
vercel --prod
```
