"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService, obtenerPedidosPorCliente, pedidosService, productosService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, MessageCircle, Loader2, ShoppingCart, Pencil } from "lucide-react"
import Link from "next/link"
import type { Cliente, Pedido, ProductoPedido } from "@/lib/types"

export default function DetalleClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productosPorPedido, setProductosPorPedido] = useState<Record<string, ProductoPedido[]>>({})
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [formNombre, setFormNombre] = useState("")
  const [formWhatsapp, setFormWhatsapp] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clientes", id), async (snap) => {
      if (!snap.exists()) {
        router.push("/clientes")
        return
      }
      const c = { id: snap.id, ...snap.data() } as Cliente
      setCliente(c)
      setFormNombre(c.nombre)
      setFormWhatsapp(c.whatsapp)
      setFormNotas(c.notas || "")

      const pedidosCliente = await obtenerPedidosPorCliente(id)
      setPedidos(pedidosCliente)

      const prodsMap: Record<string, ProductoPedido[]> = {}
      await Promise.all(
        pedidosCliente.map(async (p) => {
          prodsMap[p.id] = await productosService.listar(p.id)
        })
      )
      setProductosPorPedido(prodsMap)

      setLoading(false)
    })
    return unsub
  }, [id, router])

  const actualizarCliente = async () => {
    if (!formNombre || !formWhatsapp) {
      toast.error("Nombre y WhatsApp son requeridos")
      return
    }
    setGuardando(true)
    try {
      await clientesService.actualizar(id, {
        nombre: formNombre,
        whatsapp: formWhatsapp,
        notas: formNotas || undefined,
      })
      setEditando(false)
      toast.success("Cliente actualizado")
    } catch {
      toast.error("Error al actualizar")
    } finally {
      setGuardando(false)
    }
  }

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="page-container max-w-3xl space-y-8 animate-fade-in">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a clientes
        </Link>
        <p className="typography-label text-primary">Ficha de cliente</p>
        <h1 className="typography-title-premium">{cliente.nombre}</h1>
      </div>

      {!editando ? (
        <Card className="card-glow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Registrado {formatearFecha(cliente.creadoEn)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{cliente.whatsapp}</p>
              </div>
              {cliente.notas && (
                <div>
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="font-medium">{cliente.notas}</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://wa.me/${cliente.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contactar por WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-glow">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Label>Nombre</Label>
              <Input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>WhatsApp</Label>
              <Input value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Notas</Label>
              <Input value={formNotas} onChange={(e) => setFormNotas(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={actualizarCliente} disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Historial de Compras</h2>
        {pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este cliente no tiene compras registradas.</p>
        ) : (
          <div className="grid gap-3">
            {pedidos.map((pedido) => {
              const prods = productosPorPedido[pedido.id] || []
              const prodsCliente = prods.filter(
                (p) => p.clienteRef === id || p.clienteNombre === cliente.nombre
              )
              return (
                <Link key={pedido.id} href={`/pedidos/${pedido.id}`}>
                  <Card className="card-glow cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <p className="font-medium">{pedido.tiendaNombre}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatearFecha(pedido.fechaCreacion)} · {prodsCliente.length} producto(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatearMoneda(
                              prodsCliente.reduce(
                                (s, p) => s + p.precioUnitario * p.cantidad,
                                0
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
