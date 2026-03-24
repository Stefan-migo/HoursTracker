# Tech Stack and Architecture Document
## HoursTracker - Especificaciones Técnicas

---

## 1. Stack Tecnológico

> **⚠️ NOTA IMPORTANTE**: Este proyecto usa Next.js 16.2.1 con React 19 y Tailwind CSS 4. Estas versiones tienen cambios significativos respecto a versiones anteriores. Consulta la sección [Breaking Changes](#13-breaking-changes-nextjs-16-react-19) para más detalles.

### 1.1 Framework Principal: Next.js 16.2.1 (App Router)

#### Justificación
- **Server Components**: Renderizado eficiente en el servidor para páginas de solo lectura
- **Server Actions**: Mutación de datos sin crear endpoints API REST
- **Optimistic UI**: Actualizaciones instantáneas en el cliente
- **Middleware nativo**: Gestión de autenticación y redirecciones
- **TypeScript por defecto**: Mayor seguridad de tipos

#### Estructura del Proyecto
```
hours-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── employee/
│   │   │   ├── page.tsx          # Vista empleado
│   │   │   └── history/
│   │   │       └── page.tsx      # Historial empleado
│   │   ├── admin/
│   │   │   ├── page.tsx          # Dashboard admin
│   │   │   ├── logs/
│   │   │   │   └── page.tsx      # Tabla global
│   │   │   └── import/
│   │   │       └── page.tsx      # Importación Excel
│   │   └── layout.tsx
│   ├── api/
│   │   └── [...supabase]/
│   │       └── route.ts          # Webhook o API proxy
│   ├── layout.tsx
│   ├── page.tsx                  # Landing/redirect
│   └── globals.css
├── components/
│   ├── ui/                       # Componentes base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── card.tsx
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── auth-provider.tsx
│   ├── employee/
│   │   ├── clock-card.tsx        # Marcar entrada/salida
│   │   └── history-list.tsx
│   ├── admin/
│   │   ├── stats-dashboard.tsx
│   │   ├── logs-table.tsx
│   │   └── excel-import.tsx
│   └── shared/
│       ├── header.tsx
│       └── loading-spinner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente Supabase para browser
│   │   ├── server.ts             # Cliente Supabase para servidor
│   │   └── middleware.ts         # Cliente para middleware
│   ├── utils/
│   │   ├── date.ts               # Utilidades de fecha/hora
│   │   ├── excel.ts              # Parseo Excel con SheetJS
│   │   └── validators.ts         # Zod schemas
│   └── types/
│       └── database.ts           # Tipos de Supabase
├── hooks/
│   ├── use-auth.ts
│   ├── use-time-logs.ts
│   └── use-import.ts
├── middleware.ts                 # Auth middleware
├── .env.local                    # Variables de entorno
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Sistema de Autenticación: Supabase Auth

### 2.1 Método de Autenticación
- **Email/Password**: Método principal para empleados
- **Magic Link** (opcional): Para recuperación de contraseña

### 2.2 Configuración en Supabase Dashboard
```sql
-- En Authentication > Providers > Email
Habilitar: Email Password Auth
Confirm email: Disabled (para MVP)
```

### 2.3 Flujo de Autenticación
```
1. Usuario entra a /login
2. Ingresa email + password
3. Supabase Auth valida credenciales
4. Si válido → Genera JWT + Refresh token
5. Redirige según rol:
   - Empleado → /employee
   - Admin → /admin
6. Middleware verifica token en cada request
```

### 2.4 Gestión de Sesión
- Cookies HttpOnly para refresh tokens
- Access token en memoria (no localStorage por seguridad)
- Auto-refresh antes de expiración
- Logout limpia cookies y sesión

---

## 3. Base de Datos: Supabase PostgreSQL

### 3.1 Extensiones Requeridas
```sql
-- Habilitar uuid-ossp para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3.2 Tablas
Ver documento `docs/3_database_schema.md`

### 3.3 Row Level Security (RLS)
```sql
-- Políticas detalladas en docs/3_database_schema.md
-- profiles: Solo admin puede ver todos, usuarios ven su propio perfil
-- time_logs: Empleados ven solo los suyos, admins ven todos
```

---

## 4. Estilización: Tailwind CSS + shadcn/ui

### 4.1 Tailwind CSS
- Framework CSS utility-first
- Configuración personalizada para colores de marca
- Dark mode support (opcional para MVP)

### 4.2 shadcn/ui (Componentes)
Componentes pre-construidos basados en Radix UI:
- Button (variants: default, outline, ghost, destructive)
- Input (form inputs)
- Card (contenedores)
- Table (tablas de datos)
- Dialog (modales)
- Dropdown Menu
- Toast (notificaciones)

### 4.3 Configuración de Colores
```typescript
// tailwind.config.ts
colors: {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  secondary: {
    // Para acentos
  },
  destructive: {
    // Para errores y acciones peligrosas
  },
}
```

### 4.4 Tipografía
- Font family: Inter (Google Fonts)
- Headings: font-semibold, tracking-tight
- Body: font-normal, leading-relaxed

---

## 5. Librería Excel: SheetJS (xlsx)

### 5.1 Paquete
```bash
npm install xlsx
```

### 5.2 Uso en Cliente (Navegador)
```typescript
import * as XLSX from 'xlsx';

export async function parseExcelFile(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir a JSON con headers
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data;
}
```

### 5.3 Manejo de Formatos de Fecha Excel
Excel almacena fechas como números seriales (días desde 1900).
SheetJS los convierte automáticamente si el formato de celda es date.

```typescript
function parseExcelDate(value: any): string {
  // Si es string, parsear directamente
  if (typeof value === 'string') {
    return normalizeDateString(value);
  }
  
  // Si es número (serial de Excel), convertir
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  return '';
}
```

### 5.4 Validación de Datos Importados
```typescript
const excelSchema = z.object({
  Email: z.string().email(),
  Fecha: z.string().transform(parseDate),
  'Hora Entrada': z.string().transform(parseTime),
  'Hora Salida': z.string().transform(parseTime),
});

// Validar cada fila
const results = data.map(row => {
  const parsed = excelSchema.safeParse(row);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, error: parsed.error, row };
});
```

---

## 6. Dependencias del Proyecto

### 6.1 Dependencies (package.json)

**Versión actual (package.json actualizado):**
```json
{
  "dependencies": {
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "@supabase/supabase-js": "^2.99.3",
    "@supabase/ssr": "^0.9.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.2.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "xlsx": "^0.18.5",
    "date-fns": "^4.1.0",
    "zod": "^4.3.6",
    "lucide-react": "^0.577.0",
    "resend": "^6.9.4",
    "sonner": "^2.0.7",
    "next-themes": "^0.4.6"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.2.1"
  }
}
```

**Cambios principales desde versión anterior:**
- Next.js 14 → 16.2.1
- React 18 → 19.2.4
- Tailwind CSS 3 → 4 (configuración por CSS, no por JS)
- Zod 3 → 4.3.6 (nuevas APIs de validación)

---

## 7. Variables de Entorno

### 7.1 .env.local
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 7.2 .env.production (en servidor)
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ IMPORTANTE**: Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente.

---

## 8. Middleware de Autenticación

### 8.1 middleware.ts
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response.cookies.set(name, value);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Rutas protegidas
  const isAuthRoute = request.nextUrl.pathname.startsWith('/(auth)');
  const isEmployeeRoute = request.nextUrl.pathname.startsWith('/employee');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthRoute) {
    // Redirigir según rol
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const redirectUrl = profile?.role === 'admin' ? '/admin' : '/employee';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## 9. Server Actions

### 9.1 Acciones de Empleado
```typescript
// app/(dashboard)/employee/actions.ts
'use server'

export async function markClockIn(userId: string) {
  const supabase = createServerClient(...);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Verificar si ya existe entrada hoy
  const { data: existing } = await supabase
    .from('time_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
    
  if (existing) {
    return { error: 'Ya existe un registro para hoy' };
  }
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('time_logs')
    .insert({
      user_id: userId,
      date: today,
      clock_in: now,
    });
    
  return { error };
}

export async function markClockOut(userId: string) {
  const supabase = createServerClient(...);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Buscar entrada sin salida
  const { data: entry } = await supabase
    .from('time_logs')
    .select('id, clock_in')
    .eq('user_id', userId)
    .eq('date', today)
    .is('clock_out', null)
    .single();
    
  if (!entry) {
    return { error: 'No hay entrada sin salida' };
  }
  
  const now = new Date().toISOString();
  const clockIn = new Date(entry.clock_in);
  const clockOut = new Date(now);
  const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  
  const { error } = await supabase
    .from('time_logs')
    .update({
      clock_out: now,
      total_hours: totalHours,
    })
    .eq('id', entry.id);
    
  return { error };
}
```

### 9.2 Acciones de Admin
```typescript
// app/(dashboard)/admin/import/actions.ts
'use server'

export async function bulkImportTimeLogs(data: TimeLogInput[]) {
  const supabase = createServerClient(...);
  
  // 1. Obtener IDs de usuarios por email
  const emails = [...new Set(data.map(d => d.email))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emails);
    
  const emailToId = new Map(profiles?.map(p => [p.email, p.id]) || []);
  
  // 2. Preparar registros
  const records = data
    .filter(d => emailToId.has(d.email))
    .map(d => ({
      user_id: emailToId.get(d.email),
      date: d.date,
      clock_in: d.clockIn,
      clock_out: d.clockOut,
      total_hours: calculateHours(d.clockIn, d.clockOut),
    }));
    
  // 3. Bulk insert
  const { error } = await supabase
    .from('time_logs')
    .insert(records);
    
  return {
    imported: records.length,
    failed: data.length - records.length,
    error
  };
}
```

---

## 10. Optimizaciones de Performance

### 10.1 Rendering Strategy
| Ruta | Estrategia | Justificación |
|------|------------|---------------|
| /login | CSR | Interactividad inmediata |
| /employee | ISR (revalidate: 60) | Datos que cambian frecuentemente |
| /admin | SSR | Datos sensibles, siempre frescos |
| /admin/import | CSR | Lógica solo en cliente |

### 10.2 Optimizaciones de Bundle
- Dynamic imports para SheetJS (solo se carga en /admin/import)
- Tree shaking de shadcn/ui (solo importar componentes usados)
- Image optimization con next/image

### 10.3 Caching
- Supabase Query caching con `staleTime`
- React Query para cache de cliente
- SWR para revalidación automática

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Utilidades de fecha/hora
- Validación de schemas Zod
- Parseo de Excel

### 11.2 Integration Tests
- Server Actions completas
- Flujo de autenticación

### 11.3 E2E Tests (Playwright)
- Login flujo completo
- Marcar entrada/salida
- Importación Excel

---

## 12. Deployment

### 12.1 Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

### 12.2 Variables en Vercel
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (solo en server)

### 12.3 Supabase Production
- Crear proyecto en supabase.com
- Configurar autenticación
- Ejecutar migrations
- Actualizar variables de entorno

---

## 13. Breaking Changes (Next.js 16 / React 19)

### 13.1 React 19 Breaking Changes

#### forwardRef ya no es necesario
```typescript
// ❌ Antes (React 18)
const MyComponent = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref}>{props.children}</div>
})

// ✅ Ahora (React 19)
function MyComponent({ ref, children }: Props & { ref: React.Ref<HTMLDivElement> }) {
  return <div ref={ref}>{children}</div>
}
```

#### Context con use()
```typescript
// ❌ Antes
const value = useContext(MyContext)

// ✅ Ahora (opcional, pero recomendado)
const value = use(MyContext)
```

#### Action prop en formularios
```typescript
// ✅ Nuevo en React 19 - Server Actions directamente en forms
<form action={serverAction}>
  <input name="email" />
  <button type="submit">Enviar</button>
</form>
```

### 13.2 Next.js 16 Breaking Changes

#### next/font cambios
```typescript
// ❌ Antes
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })

// ✅ Ahora - Inter viene preconfigurado o usa localFont
import { GeistSans } from 'geist/font/sans'
```

#### Middleware con cookies
```typescript
// ❌ Antes (Next.js 14)
cookies().set('name', 'value')

// ✅ Ahora (Next.js 16)
const cookieStore = await cookies()
cookieStore.set('name', 'value')
```

### 13.3 Tailwind CSS 4 Breaking Changes

#### Configuración por CSS
```css
/* ✅ Ahora: globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #0a84ff;
  --color-success: #30d158;
  /* ... */
}
```

#### Sin tailwind.config.js
```typescript
// ❌ Ya no existe tailwind.config.ts en Tailwind 4
// La configuración se hace directamente en CSS con @theme
```

### 13.4 Zod 4 Breaking Changes

#### Nuevos métodos de validación
```typescript
// ✅ Zod 4 - Métodos mejorados
const schema = z.object({
  email: z.email(),        // Nuevo método específico
  name: z.string().min(2),
})

// Validación asíncrona mejorada
const result = await schema.parseAsync(data)
```

### 13.5 Recomendaciones de Migración

1. **Leer documentación**: Revisa `node_modules/next/dist/docs/` para APIs específicas de Next.js 16
2. **Testing**: Prueba todas las funcionalidades después de actualizar
3. **TypeScript**: Asegúrate de usar @types/react ^19
4. **ESLint**: Actualiza a eslint-config-next 16.2.1

---

*Documento actualizado: Marzo 2026*
*Versiones: Next.js 16.2.1 | React 19.2.4 | Tailwind CSS 4.x*
