"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight, Package, Globe } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [modoEmail, setModoEmail] = useState(false);

  const manejarExito = () => {
    toast.success("¡Bienvenida de vuelta!");
    router.push("/");
  };

  const manejarError = (error: unknown) => {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    if (mensaje.includes("popup-closed-by-user")) return;
    toast.error("Error de autenticación", { description: mensaje });
  };

  const loginConGoogle = async () => {
    setCargando(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      manejarExito();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  const loginConEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !contrasena) {
      toast.warning("Completa todos los campos");
      return;
    }
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email, contrasena);
      manejarExito();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-dvh flex">
      {/* LEFT PANEL - Modern Purple Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#7B4D96] via-[#8B5DA7] to-[#5B3D8C]">
        {/* Animated gradient orbs with glassmorphism */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-white/10 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-purple-400/20 rounded-full blur-[140px] animate-blob" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-300/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        </div>

        {/* Elegant geometric pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-elegant" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid-elegant)" />
          </svg>
        </div>

        {/* Floating orbs decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-16 h-16 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 animate-float" />
          <div className="absolute top-40 right-32 w-8 h-8 bg-purple-400/20 rounded-full backdrop-blur-sm animate-float animation-delay-1000" />
          <div className="absolute bottom-32 left-32 w-12 h-12 bg-white/10 rounded-full backdrop-blur-sm animate-float animation-delay-2000" />
          <div className="absolute bottom-20 right-40 w-6 h-6 bg-purple-300/30 rounded-full backdrop-blur-sm animate-float" />
        </div>

        {/* Main logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[50vw] h-[50vw] opacity-[0.02] rotate-12">
            <Package className="w-full h-full" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-20 h-full">
          <div className="flex items-center gap-5 mb-12">
            <div className="relative w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg shadow-black/20">
              <Image src="/logo_muv.png" alt="Mø" fill className="object-contain invert brightness-150" />
            </div>
            <div>
              <h1 className="text-5xl font-heading font-bold text-white tracking-tight leading-none">
                M<span className="text-purple-300">ø</span>v
              </h1>
              <p className="text-purple-200/70 text-sm tracking-widest uppercase mt-1">
                Logística Global
              </p>
            </div>
          </div>
          
          <div className="max-w-lg">
            <h2 className="text-5xl font-heading font-bold text-white leading-[1.15] mb-6">
              Gestión internacional
              <span className="block text-purple-200/90 font-normal mt-2">
                simplificada
              </span>
            </h2>
            
            <p className="text-lg text-purple-100/70 leading-relaxed max-w-md mb-10">
              Administra tus pedidos desde China a Venezuela con seguimiento en tiempo real. 
              Optimiza cada paso de tu cadena de suministro con nuestras herramientas inteligentes.
            </p>

            {/* Value props with elegant cards */}
            <div className="space-y-4">
              {[ 
                { icon: Globe, title: "Seguimiento Global", desc: "Monitorea cada envío en tiempo real" },
                { icon: Package, title: "Gestión Integral", desc: "Clientes, pedidos y finanzas unificados" },
                { icon: Mail, title: "Soporte Prioritario", desc: "Asistencia dedicada para tu negocio" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-purple-400/20 transition-all duration-500">
                    <item.icon className="w-5 h-5 text-white/70 group-hover:text-purple-200 transition-colors" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">{item.title}</p>
                    <p className="text-purple-200/50 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* RIGHT PANEL - Sleek Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-50/50 via-background to-background dark:from-purple-900/10 dark:via-background dark:to-background" />
        
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-12">
            <div className="relative w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20 shadow-lg">
              <Image src="/logo_muv.png" alt="Mø" fill className="object-contain p-3" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-heading font-bold text-foreground">M<span className="text-primary">ø</span>v</h1>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">Logística Global</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl shadow-black/10 p-8 lg:p-10 relative overflow-hidden">
            {/* Card accent decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl animate-blob animation-delay-1000" />
            
            <div className="relative z-10">
              {/* Header */}
              <div className="mb-8 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    Área de Acceso
                  </span>
                </div>
                <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
                  Bienvenida
                </h2>
                <p className="text-muted-foreground text-sm">
                  Inicia sesión para acceder a tu panel
                </p>
              </div>

              {/* Form */}
              <div className="animate-fade-up animation-delay-100">
                {/* Google Sign In */}
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl text-base font-medium border-border/60 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group"
                  onClick={loginConGoogle}
                  disabled={cargando}
                  id="btn-login-google"
                >
                  {cargando ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <svg className="size-5 mr-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  <span>Continuar con Google</span>
                </Button>

                {!modoEmail && (
                  <>
                    <div className="relative py-6">
                      <Separator className="bg-border/50" />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                        <span className="px-4 text-xs text-muted-foreground/70 font-medium uppercase tracking-widest bg-card">
                          o continúa con
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl text-base border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary hover:text-primary transition-all duration-300"
                      onClick={() => setModoEmail(true)}
                      id="btn-toggle-email"
                    >
                      <Mail className="size-5 mr-2 opacity-70" />
                      Correo electrónico
                    </Button>
                  </>
                )}

                {modoEmail && (
                  <>
                    <div className="relative py-6">
                      <Separator className="bg-border/50" />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                        <span className="px-4 text-xs text-muted-foreground/70 font-medium uppercase tracking-widest bg-card">
                          acceso por correo
                        </span>
                      </div>
                    </div>

                    <form onSubmit={loginConEmail} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                          Correo electrónico
                        </Label>
                        <div className="relative group">
                          <Input
                            id="email"
                            type="email"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={cargando}
                            autoComplete="email"
                            className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-muted-foreground/50"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contrasena" className="text-sm font-medium text-muted-foreground">
                          Contraseña
                        </Label>
                        <div className="relative group">
                          <Input
                            id="contrasena"
                            type="password"
                            placeholder="••••••••"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            disabled={cargando}
                            autoComplete="current-password"
                            className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-muted-foreground/50"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 group"
                        disabled={cargando}
                        id="btn-login-email"
                      >
                        {cargando ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <>
                            <span>Iniciar Sesión</span>
                            <ArrowRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t border-border/30 text-center">
                <p className="text-xs text-muted-foreground/60">
                  Müv Gestión · Plataforma Segura
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                  © 2024 Todos los derechos reservados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
