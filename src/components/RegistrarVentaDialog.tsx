"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService } from "@/lib/firebaseServices"
import { formatearMoneda } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ShoppingCart } from "lucide-react"
import type { ArticuloTienda } from "@/lib/types"
import type { Cliente } from "@/lib/types"

interface RegistrarVentaDialogProps {
  articulosEnStock: ArticuloTienda[]
}

export default function RegistrarVentaDialog({ articulosEnStock }: RegistrarVentaDialogProps) {
  const [open, setOpen] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [articuloId, setArticuloId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (open) {
      clientesService.listar().then(setClientes).catch(() => {})
    }
  }, [open])

  const articuloSeleccionado = articulosEnStock.find((a) => a.id === articuloId)
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)

  function handleCancelar() {
    setOpen(false)
    setArticuloId("")
    setClienteId("")
  }

  async function handleRegistrar() {
    if (!articuloId || !clienteId) {
      toast.error("Selecciona un artículo y un cliente")
      return
    }

    setEnviando(true)
    try {
      await updateDoc(doc(db, "inventario", articuloId), {
        estado: "vendido",
        clienteNombre: clienteSeleccionado?.nombre ?? "",
        fechaVenta: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      })
      toast.success("Venta registrada")
      setOpen(false)
      setArticuloId("")
      setClienteId("")
    } catch {
      toast.error("Error al registrar venta")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Registrar venta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
          <DialogDescription>
            Selecciona el artículo vendido y el cliente al que se lo vendiste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Artículo</Label>
            {articulosEnStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay artículos en stock para vender.
              </p>
            ) : (
              <Select value={articuloId} onValueChange={setArticuloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar artículo..." />
                </SelectTrigger>
                <SelectContent>
                  {articulosEnStock.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre} — {formatearMoneda(a.precioVenta)} (Stock: {a.cantidad})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            {clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay clientes registrados.
              </p>
            ) : (
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} — {c.whatsapp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {articuloSeleccionado && clienteSeleccionado && (
            <div className="glass-panel p-4 space-y-1 text-sm">
              <p className="font-semibold">Resumen</p>
              <p>
                {articuloSeleccionado.nombre} — {formatearMoneda(articuloSeleccionado.precioVenta)}
              </p>
              <p className="text-muted-foreground">Cliente: {clienteSeleccionado.nombre}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrar}
            disabled={!articuloId || !clienteId || enviando || articulosEnStock.length === 0 || clientes.length === 0}
          >
            {enviando ? "Registrando..." : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
