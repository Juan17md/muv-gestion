"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { tiendasService } from "@/lib/firebaseServices"
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

      <div className="grid gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="card-glow">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : tiendas.map((tienda, idx) => (
              <Card
                key={tienda.id}
                className={cn(
                  "card-glow animate-fade-up",
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">{tienda.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatearFecha(tienda.creadoEn)}
                        {tienda.notas && ` · ${tienda.notas}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirDialogo(tienda)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => eliminar(tienda.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

        {!loading && tiendas.length === 0 && (
          <div className="text-center py-16">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No hay tiendas</p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => abrirDialogo()}
            >
              <Plus className="h-4 w-4" />
              Registrar primera tienda
            </Button>
          </div>
        )}
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
