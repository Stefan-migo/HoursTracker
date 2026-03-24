# Patrones de Componentes UI/UX

Este archivo contiene patrones de componentes reutilizables siguiendo las mejores prácticas de diseño Apple/Mac y ChatGPT.

---

## Patrones de Layout

### Dashboard Principal

```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-background-secondary border-r border-border-subtle">
        <div className="p-4 border-b border-border-subtle">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <Navigation />
        </nav>
        <div className="p-4 border-t border-border-subtle">
          <UserProfile />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border-subtle px-6 flex items-center justify-between">
          <PageTitle />
          <HeaderActions />
        </header>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
```

### Sidebar Navigation

```tsx
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-muted text-accent'
                : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

### Header

```tsx
export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border-subtle px-6 flex items-center justify-between bg-background">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {actions}
        <ThemeSwitch />
        <UserMenu />
      </div>
    </header>
  )
}
```

---

## Patrones de Data Display

### Stats Grid

```tsx
export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-background border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-foreground-secondary">
              {stat.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
            </div>
            {stat.change && (
              <p className={cn(
                'text-xs mt-1',
                stat.change > 0 ? 'text-success' : 'text-error'
              )}>
                {stat.change > 0 ? '+' : ''}{stat.change}% desde el mes pasado
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Data Table

```tsx
export function DataTable({ columns, data, pagination }: DataTableProps) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Título</h3>
        <div className="flex gap-2">
          <Input placeholder="Buscar..." className="w-64" />
          <Button variant="outline">Filtrar</Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-secondary">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-background-secondary transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-foreground">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between">
          <p className="text-sm text-foreground-secondary">
            Mostrando {pagination.from} - {pagination.to} de {pagination.total}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm">Anterior</Button>
            <Button variant="outline" size="sm">Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### List View

```tsx
export function ListView({ items, renderItem }: ListViewProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="
            bg-background border border-border-subtle
            rounded-lg p-4
            hover:bg-background-secondary
            transition-colors cursor-pointer
          "
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}
```

---

## Patrones de Formularios

### Login Form

```tsx
export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            className="border-border bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/forgot-password" className="text-sm text-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            className="border-border bg-background"
            required
          />
        </div>
      </div>

      <Button className="w-full" disabled={isLoading}>
        {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
      </Button>

      <p className="text-center text-sm text-foreground-secondary">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  )
}
```

### Settings Form

```tsx
export function SettingsForm({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-8">
      {/* Perfil */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Perfil</h3>
        
        <div className="flex items-center gap-4">
          <Avatar size="lg" />
          <div>
            <Button variant="outline" size="sm">Cambiar foto</Button>
            <p className="text-xs text-foreground-secondary mt-1">
              JPG, GIF o PNG. Máximo 2MB.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input defaultValue={settings.name} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" defaultValue={settings.email} />
          </div>
        </div>
      </section>

      {/* Preferencias */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Preferencias</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Tema oscuro</Label>
              <p className="text-sm text-foreground-secondary">
                Usar tema oscuro automáticamente
              </p>
            </div>
            <Switch defaultChecked={settings.darkMode} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notificaciones</Label>
              <p className="text-sm text-foreground-secondary">
                Recibir notificaciones por email
              </p>
            </div>
            <Switch defaultChecked={settings.notifications} />
          </div>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
        <Button variant="outline">Cancelar</Button>
        <Button>Guardar cambios</Button>
      </div>
    </div>
  )
}
```

---

## Patrones de Feedback

### Toast Notifications

```tsx
export function Toast({ title, description, variant = 'default' }: ToastProps) {
  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 rounded-lg border p-4 shadow-lg animate-scale-in',
      variant === 'success' && 'bg-success-muted border-success/30',
      variant === 'error' && 'bg-error-muted border-error/30',
      variant === 'warning' && 'bg-warning/10 border-warning/30',
      variant === 'default' && 'bg-background border-border'
    )}>
      <div className="flex items-start gap-3">
        {variant !== 'default' && (
          <Icon className={cn(
            'h-5 w-5',
            variant === 'success' && 'text-success',
            variant === 'error' && 'text-error',
            variant === 'warning' && 'text-warning'
          )} />
        )}
        <div>
          <h4 className="font-medium text-foreground">{title}</h4>
          {description && (
            <p className="text-sm text-foreground-secondary mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Loading States

```tsx
// Skeleton para cards
export function CardSkeleton() {
  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </CardContent>
    </Card>
  )
}

// Skeleton para tabla
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
```

### Empty State

```tsx
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-background-tertiary p-3 mb-4">
        <Icon className="h-6 w-6 text-foreground-secondary" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-foreground-secondary max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}
```

---

## Patrones de Navegación

### Breadcrumbs

```tsx
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-foreground-secondary" />
          )}
          {index === items.length - 1 ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-foreground-secondary hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
```

### Tabs

```tsx
export function Tabs({ tabs, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || tabs[0].value)

  return (
    <div className="space-y-4">
      <div className="border-b border-border-subtle">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'pb-3 text-sm font-medium transition-colors relative',
                activeTab === tab.value
                  ? 'text-foreground'
                  : 'text-foreground-secondary hover:text-foreground'
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        {tabs.find(tab => tab.value === activeTab)?.content}
      </div>
    </div>
  )
}
```

---