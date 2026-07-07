"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { tiendasService } from "@/lib/firebaseServices"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Plus, Store, Pencil, Trash2, Loader2 } from "lucide-react"
import type { Tienda } from "@/lib/types"

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const [formNombre, setFormNombre] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "tiendas"), orderBy("nombre"))
    const unsub = onSnapshot(q, (snap) => {
      setTiendas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tienda)))
      setLoading(false)
    })
    return unsub
  }, [])

  const abrirDialogo = (tienda?: Tienda) => {
    if (tienda) {
      setEditandoId(tienda.id)
      setFormNombre(tienda.nombre)
      setFormNotas(tienda.notas || "")
    } else {
      setEditandoId(null)
      setFormNombre("")
      setFormNotas("")
    }
    setDialogoAbierto(true)
  }

  const guardar = async () => {
    if (!formNombre) {
      toast.error("El nombre es requerido")
      return
    }
    setGuardando(true)
    try {
      if (editandoId) {
        await tiendasService.actualizar(editandoId, {
          nombre: formNombre,
          notas: formNotas || undefined,
        })
        toast.success("Tienda actualizada")
      } else {
        await tiendasService.crear({
          nombre: formNombre,
          notas: formNotas || undefined,
        })
        toast.success("Tienda registrada")
      }
      setDialogoAbierto(false)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminandoId(id)
  }

  const confirmarEliminar = async () => {
    if (!eliminandoId) return
    await tiendasService.eliminar(eliminandoId)
    toast.success("Tienda eliminada")
    setEliminandoId(null)
  }

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Catálogo</p>
          <h1 className="typography-title-premium">Tiendas</h1>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => abrirDialogo()}>
              <Plus className="h-4 w-4" />
              Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Tienda" : "Registrar Tienda"}</DialogTitle>
              <DialogDescription className="sr-only">
                {editandoId ? "Edita los datos de la tienda" : "Registra una nueva tienda"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Nombre</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre de la tienda"
                />
              </div>
              <div className="space-y-3">
                <Label>Notas (opcional)</Label>
                <Input
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Tipo de productos, plataforma..."
                />
              </div>
              <Button onClick={guardar} className="w-full" disabled={guardando}>
                {guardando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editandoId ? (
                  "Actualizar tienda"
                ) : (
                  "Guardar tienda"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              : tiendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Store className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground mb-3">No hay tiendas</p>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => abrirDialogo()}>
                        <Plus className="h-3 w-3" />
                        Registrar primera tienda
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              : tiendas.map((tienda) => (
                  <TableRow key={tienda.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{tienda.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{tienda.notas || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatearFecha(tienda.creadoEn)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => abrirDialogo(tienda)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => eliminar(tienda.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!eliminandoId} onOpenChange={(open) => !open && setEliminandoId(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tienda</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás segura de eliminar esta tienda? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEliminandoId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmarEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
