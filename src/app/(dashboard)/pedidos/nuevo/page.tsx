"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, tiendasService } from "@/lib/firebaseServices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Store } from "lucide-react"
import Link from "next/link"
import type { Tienda } from "@/lib/types"

export default function NuevoPedidoPage() {
  const router = useRouter()
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loading, setLoading] = useState(false)
  const [cargandoTiendas, setCargandoTiendas] = useState(true)

  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("")
  const [nuevaTienda, setNuevaTienda] = useState("")

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "tiendas"), orderBy("nombre")),
      (snap) => {
        setTiendas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tienda)))
        setCargandoTiendas(false)
      }
    )
    return unsub
  }, [])

  const crearPedido = async () => {
    const nombreTienda = tiendaSeleccionada
      ? tiendas.find((t) => t.id === tiendaSeleccionada)?.nombre || ""
      : nuevaTienda.trim()

    if (!nombreTienda) {
      toast.error("Selecciona o escribe una tienda")
      return
    }

    setLoading(true)
    try {
      let tiendaRef = tiendaSeleccionada
      if (!tiendaSeleccionada && nuevaTienda.trim()) {
        const doc = await tiendasService.crear({ nombre: nuevaTienda.trim() })
        tiendaRef = doc.id
      }

      const doc = await pedidosService.crear({
        tiendaRef,
        tiendaNombre: nombreTienda,
        estado: "borrador",
        ubicacion: "tienda",
      })

      toast.success("Pedido creado")
      router.push(`/pedidos/${doc.id}`)
    } catch {
      toast.error("Error al crear el pedido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container max-w-2xl space-y-8 animate-fade-in">
      <div>
        <Link
          href="/pedidos"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a pedidos
        </Link>
        <p className="typography-label text-primary">Nuevo registro</p>
        <h1 className="typography-title-premium">Crear Pedido</h1>
      </div>

      <Card className="card-glow">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Tienda existente</Label>
            {cargandoTiendas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tiendas...
              </div>
            ) : tiendas.length > 0 ? (
              <div className="grid gap-2">
                {tiendas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTiendaSeleccionada(t.id)
                      setNuevaTienda("")
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                      tiendaSeleccionada === t.id
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{t.nombre}</p>
                      {t.notas && (
                        <p className="text-xs text-muted-foreground">{t.notas}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay tiendas registradas. Crea una nueva.
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                O escribe una tienda nueva
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nueva-tienda">Nombre de la tienda</Label>
            <Input
              id="nueva-tienda"
              placeholder="Ej: AliExpress, Shopee..."
              value={nuevaTienda}
              onChange={(e) => {
                setNuevaTienda(e.target.value)
                setTiendaSeleccionada("")
              }}
            />
          </div>

          <Button
            onClick={crearPedido}
            className="w-full"
            disabled={loading || (!tiendaSeleccionada && !nuevaTienda.trim())}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Crear pedido en borrador"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
