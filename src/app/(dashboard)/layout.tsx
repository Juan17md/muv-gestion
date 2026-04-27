"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  Users,
  Store,
  LogOut,
  Menu,
  Moon,
  Sun,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/dashboard", label: "Dashboard", icono: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icono: Package },
  { href: "/clientes", label: "Clientes", icono: Users },
  { href: "/tiendas", label: "Tiendas", icono: Store },
] as const;

function ToggleTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  if (!montado) return <Skeleton className="size-9 rounded-xl" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      id="btn-toggle-tema"
      className="shrink-0 rounded-xl hover:bg-accent/50 hover:text-primary transition-all duration-300 group relative"
    >
      <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-400 group-hover:text-amber-500" />
      <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400 group-hover:text-sky-300" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

function ContenidoSidebar({ cerrar }: { cerrar?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    await signOut(auth);
    toast.info("Sesión cerrada");
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header del Sidebar */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="relative w-10 h-10 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
          <Image
            src="/logo_muv.png"
            alt="Mø"
            fill
            className="object-contain p-1.5"
          />
        </div>
        <div>
          <span className="text-lg font-heading font-bold tracking-tight">M<span className="text-primary">ø</span>v</span>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Panel</p>
        </div>
      </div>

      <Separator className="mx-3 opacity-50" />

      {/* Navegación Principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SECCIONES.map(({ href, label, icono: Icono }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={cerrar}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative",
                activo
                  ? "bg-primary/10 text-primary shadow-lg shadow-primary/10" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              id={`nav-${label.toLowerCase()}`}
            >
              {activo && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
              )}
              <Icono className={cn("size-5 transition-transform duration-300", activo ? "translate-x-1" : "group-hover:scale-110")} />
              <span className="font-medium">{label}</span>
              {activo && (
                <ChevronsRight className="absolute right-3 size-4 text-primary opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer del Sidebar */}
      <div className="p-3 space-y-3 border-t border-border/50 mt-auto">
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-accent/30 border border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Sistema Activo</span>
          </div>
          <ToggleTema />
        </div>
        
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-3 w-full px-3.5 py-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 group"
          id="btn-cerrar-sesion"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
            <LogOut className="size-4 text-destructive group-hover:text-destructive" />
          </div>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, cargando } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push("/login");
    }
  }, [usuario, cargando, router]);

  if (cargando) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 animate-pulse">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 backdrop-blur-sm border border-primary/20" />
            <div className="absolute inset-3 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 animate-pulse" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 mx-auto rounded-full" />
            <Skeleton className="h-3 w-24 mx-auto rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="min-h-dvh flex bg-background relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[200px] animate-blob" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[200px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[200px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--background)_0%,_var(--background)_100%)]" />
        <div className="absolute inset-0 bg-grid-slate-200/20 [mask-image:linear-gradient(0deg,transparent,black,transparent)] dark:bg-grid-slate-700/30" />
      </div>

      {/* Sidebar Desktop */}
      <aside 
        className={`hidden lg:flex lg:flex-col h-dvh sticky top-0 transition-all duration-500 ease-in-out z-30
          ${sidebarColapsado ? "w-20" : "w-72"}`}
      >
        <div className="flex flex-col h-full bg-sidebar/80 backdrop-blur-xl border-r border-border/50 shadow-lg shadow-black/5">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            {!sidebarColapsado && (
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20 shadow-lg">
                  <Image src="/logo_muv.png" alt="Mø" fill className="object-contain p-1.5" />
                </div>
                <div>
                  <span className="text-lg font-heading font-bold tracking-tight">M<span className="text-primary">ø</span>v</span>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Panel</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarColapsado(!sidebarColapsado)}
              className="rounded-xl hover:bg-accent/50 hover:text-primary transition-all shrink-0"
            >
              {sidebarColapsado ? (
                <ChevronsRight className="size-4" />
              ) : (
                <ChevronsLeft className="size-4" />
              )}
            </Button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {SECCIONES.map(({ href, label, icono: Icono }) => {
              const activo = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative",
                    activo
                      ? "bg-primary/10 text-primary shadow-lg shadow-primary/10" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                  id={`nav-${label.toLowerCase()}`}
                >
                  {activo && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                  )}
                  <Icono className={cn("size-5 transition-transform duration-300", activo ? "translate-x-1" : "group-hover:scale-110")} />
                  {!sidebarColapsado && (
                    <>
                      <span className="font-medium">{label}</span>
                      {activo && (
                        <ChevronsRight className="absolute right-3 size-4 text-primary opacity-50" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border/50">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-accent/30 border border-border/50">
              {!sidebarColapsado && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">Activo</span>
                </div>
              )}
              <ToggleTema />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-0">
        {/* Header Mobile */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
              <Image src="/logo_muv.png" alt="Mø" fill className="object-contain p-1" />
            </div>
            <div>
              <span className="text-lg font-heading font-bold">M<span className="text-primary">ø</span>v</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToggleTema />
            <Sheet open={sheetAbierto} onOpenChange={setSheetAbierto}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl" id="btn-menu-mobile">
                  <Menu className="size-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 border-l border-border/50">
                <ContenidoSidebar cerrar={() => setSheetAbierto(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Area */}
        <main className="relative z-10 pb-20 lg:pb-8">
          {children}
        </main>

        {/* Navigation Mobile */}
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {SECCIONES.map(({ href, label, icono: Icono }) => {
              const activo = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium rounded-xl transition-all duration-300 group",
                    activo 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <div className={cn("p-2 rounded-xl transition-colors", activo ? "bg-primary/20" : "bg-accent/50 group-hover:bg-accent")}>
                    <Icono className={cn("size-5", activo && "scale-110")} />
                  </div>
                  <span className="font-medium">{label}</span>
                  {activo && (
                    <div className="absolute -top-1 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}


function ContenidoSidebar({ cerrar }: { cerrar?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    await signOut(auth);
    toast.info("Sesión cerrada");
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="relative w-9 h-9 shrink-0">
          <Image
            src="/logo_muv.png"
            alt="Müv"
            fill
            className="object-contain"
          />
        </div>
        <span className="text-lg font-heading tracking-tight">Müv</span>
      </div>

      <Separator />

      <nav className="flex-1 px-3 py-6 space-y-1">
        {SECCIONES.map(({ href, label, icono: Icono }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={cerrar}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-smooth",
                activo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              id={`nav-${label.toLowerCase()}`}
            >
              <Icono className="size-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="px-3 py-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Tema</span>
          <ToggleTema />
        </div>
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-smooth w-full"
          id="btn-cerrar-sesion"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, cargando } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sheetAbierto, setSheetAbierto] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push("/login");
    }
  }, [usuario, cargando, router]);

  if (cargando) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 animate-pulse">
            <Image
              src="/logo_muv.png"
              alt="Müv"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="min-h-dvh flex bg-background">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-sidebar">
        <ContenidoSidebar />
      </aside>

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 flex items-center justify-between h-14 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <Image
                src="/logo_muv.png"
                alt="Müv"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-heading text-sm">Müv</span>
          </div>

          <div className="flex items-center gap-1">
            <ToggleTema />
            <Sheet open={sheetAbierto} onOpenChange={setSheetAbierto}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" id="btn-menu-mobile">
                  <Menu className="size-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <ContenidoSidebar cerrar={() => setSheetAbierto(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-sm lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {SECCIONES.map(({ href, label, icono: Icono }) => {
            const activo = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 text-[10px] font-medium transition-smooth",
                  activo ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                id={`nav-mobile-${label.toLowerCase()}`}
              >
                <Icono className={cn("size-5", activo && "scale-110")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}