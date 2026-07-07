"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService } from "@/lib/firebaseServices"
import { formatearFecha } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Search, Users, MessageCircle, Loader2 } from "lucide-react"
import type { Cliente } from "@/lib/types"

export default function ClientesPage() {
  const router = useRouter()
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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        {busqueda ? "Sin resultados" : "No hay clientes"}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              : filtrados.map((cliente) => (
                  <TableRow
                    key={cliente.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/clientes/${cliente.id}`)}
                  >
                    <TableCell className="font-medium">{cliente.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{cliente.whatsapp}</TableCell>
                    <TableCell className="text-muted-foreground">{formatearFecha(cliente.creadoEn)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://wa.me/${cliente.whatsapp}`, "_blank")
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
