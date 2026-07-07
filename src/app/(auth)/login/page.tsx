"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleTema } from "@/components/ToggleTema"
import { Package, DollarSign, Truck, TrendingUp, Loader2, Mail, Lock } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const loginEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Completa todos los campos")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success("Sesión iniciada")
      router.push("/dashboard")
    } catch {
      toast.error("Credenciales incorrectas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[oklch(0.28_0.05_285)] via-[oklch(0.38_0.08_285)] via-[oklch(0.45_0.10_285)] to-[oklch(0.35_0.06_285)] flex-col items-center justify-center p-12">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-purple-300/20 blur-[90px] animate-float" />
        <div className="absolute bottom-32 right-20 w-48 h-48 rounded-full bg-purple-400/15 blur-[90px] animate-float delay-500" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/10 blur-[90px] animate-float delay-1000" />

        <div className="relative z-10 text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xl mb-6 border border-white/20">
            <span className="text-white font-black text-3xl">M</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-3">Müv</h1>
          <p className="text-white/70 text-lg font-light">Gestión inteligente de pedidos internacionales</p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-md">
          {[
            { icon: Package, label: "Pedidos", value: "Multi-cliente" },
            { icon: DollarSign, label: "Pagos", value: "Control total" },
            { icon: Truck, label: "Envíos", value: "China → USA → VEN" },
            { icon: TrendingUp, label: "Ganancias", value: "Margen por producto" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="p-2 rounded-lg bg-white/10">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-white text-sm font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-4 right-4">
          <ToggleTema />
        </div>

        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          <div className="text-center lg:text-left">
            <h2 className="typography-title-premium">Bienvenida</h2>
            <p className="typography-desc-premium text-muted-foreground mt-2">
              Inicia sesión para gestionar tus pedidos
            </p>
          </div>

          <form onSubmit={loginEmail} className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-[50px] rounded-[10px] bg-[oklch(0.25_0.03_285)] hover:bg-[oklch(0.25_0.03_285)]/90 hover:-translate-y-0.5 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
