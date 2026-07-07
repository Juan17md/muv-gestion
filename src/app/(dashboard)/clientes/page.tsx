"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService } from "@/lib/firebaseServices"
import { formatearFecha, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Search, Users, MessageCircle, ArrowRight, Loader2 } from "lucide-react"
import type { Cliente } from "@/lib/types"

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const [formNombre, setFormNombre] = useState("")
  const [formWhatsapp, setFormWhatsapp] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("nombre"))
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente)))
      setLoading(false)
    })
    return unsub
  }, [])

  const crearCliente = async () => {
    if (!formNombre || !formWhatsapp) {
      toast.error("Nombre y WhatsApp son requeridos")
      return
    }
    setGuardando(true)
    try {
      await clientesService.crear({
        nombre: formNombre,
        whatsapp: formWhatsapp,
        notas: formNotas || undefined,
      })
      setFormNombre("")
      setFormWhatsapp("")
      setFormNotas("")
      setDialogoAbierto(false)
      toast.success("Cliente registrado")
    } catch {
      toast.error("Error al registrar cliente")
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = clientes.filter((c) =>
    busqueda ? c.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
  )

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Directorio</p>
          <h1 className="typography-title-premium">Clientes</h1>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Cliente</DialogTitle>
              <DialogDescription className="sr-only">
                Registra un nuevo cliente en el sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Nombre</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-3">
                <Label>WhatsApp</Label>
                <Input
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="Ej: 584121234567"
                />
              </div>
              <div className="space-y-3">
                <Label>Notas (opcional)</Label>
                <Input
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Referencias, dirección..."
                />
              </div>
              <Button onClick={crearCliente} className="w-full" disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-10"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-glow">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : filtrados.map((cliente, idx) => (
              <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
                <Card
                  className={cn(
                    "card-glow cursor-pointer hover:shadow-md transition-all duration-300",
                    "animate-fade-up"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold">{cliente.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatearFecha(cliente.creadoEn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(
                            `https://wa.me/${cliente.whatsapp}`,
                            "_blank"
                          )
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

        {!loading && filtrados.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {busqueda ? "Sin resultados" : "No hay clientes"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
