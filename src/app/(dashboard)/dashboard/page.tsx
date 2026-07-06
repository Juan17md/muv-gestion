"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, calcularDiasEstancado, ESTADOS_PEDIDO, cn } from "@/lib/utils"
import { DIAS_ESTANCAMIENTO } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, DollarSign, TrendingUp, Truck, AlertTriangle, Plus, ArrowRight, ShoppingCart } from "lucide-react"
import type { Pedido, ProductoPedido } from "@/lib/types"

export default function DashboardPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [productosPorPedido, setProductosPorPedido] = useState<Record<string, ProductoPedido[]>>({})

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
    const unsub = onSnapshot(q, async (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido))
      setPedidos(lista)
      setLoading(false)

      const prodsMap: Record<string, ProductoPedido[]> = {}
      await Promise.all(
        lista.slice(0, 5).map(async (p) => {
          prodsMap[p.id] = await productosService.listar(p.id)
        })
      )
      setProductosPorPedido(prodsMap)
    })
    return unsub
  }, [])

  const pedidosActivos = pedidos.filter((p) => p.estado !== "cerrado")
  const pedidosBorrador = pedidos.filter((p) => p.estado === "borrador")
  const enTransito = pedidos.filter(
    (p) => p.estado === "transito_china_usa" || p.estado === "transito_usa_ven"
  )

  const totalPendiente = Object.entries(productosPorPedido).reduce((sum, [, prods]) => {
    return (
      sum +
      prods
        .filter((pr) => pr.estadoPago !== "pagado")
        .reduce((s, pr) => s + (pr.precioUnitario * pr.cantidad + (pr.margen || 0) - (pr.montoPagado || 0)), 0)
    )
  }, 0)

  const gananciasMes = pedidos.reduce((sum, p) => sum + (p.gananciaTotal || 0), 0)

  const metricas = [
    { icon: Package, label: "Pedidos Activos", valor: pedidosActivos.length.toString(), color: "text-blue-600" },
    { icon: DollarSign, label: "Pendiente por Cobrar", valor: formatearMoneda(totalPendiente), color: "text-yellow-600" },
    { icon: TrendingUp, label: "Ganancias del Mes", valor: formatearMoneda(gananciasMes), color: "text-emerald-600" },
    { icon: Truck, label: "En Tránsito", valor: enTransito.length.toString(), color: "text-violet-600" },
  ]

  const pedidosRecientes = pedidos.slice(0, 5)

  return (
    <div className="page-container space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Panel principal</p>
          <h1 className="typography-title-premium">Dashboard</h1>
        </div>
        <Link href="/pedidos/nuevo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map(({ icon: Icon, label, valor, color }) => (
          <Card key={label} className="card-glow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">{label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className={`text-2xl font-bold ${color}`}>{valor}</p>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pedidosActivos.filter(
        (p) => calcularDiasEstancado(p.actualizadoEn) > DIAS_ESTANCAMIENTO && p.estado !== "cerrado"
      ).length > 0 && (
        <div className="glass-panel p-5 border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-semibold">Pedidos Estancados</p>
              <p className="text-sm text-muted-foreground">
                {
                  pedidosActivos.filter(
                    (p) => calcularDiasEstancado(p.actualizadoEn) > DIAS_ESTANCAMIENTO
                  ).length
                }{" "}
                pedidos sin actualizar en más de {DIAS_ESTANCAMIENTO} días
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Pedidos Recientes</h2>
          <Link
            href="/pedidos"
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
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
            : pedidosRecientes.map((pedido, idx) => {
                const estadoInfo = ESTADOS_PEDIDO.find((e) => e.valor === pedido.estado)
                const items = productosPorPedido[pedido.id] || []
                const totalProductos = items.reduce((s, p) => s + p.cantidad, 0)
                return (
                  <Link key={pedido.id} href={`/pedidos/${pedido.id}`}>
                    <Card
                      className={cn(
                        "card-glow cursor-pointer hover:shadow-md transition-all duration-300",
                        "animate-fade-up"
                      )}
                      style={{ animationDelay: `${idx * 75}ms` }}
                    >
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <p className="font-semibold">{pedido.tiendaNombre}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {totalProductos} productos · {formatearFecha(pedido.fechaCreacion)}
                          </p>
                        </div>
                        <Badge className={cn(estadoInfo?.color, "border-0")}>
                          {estadoInfo?.etiqueta || pedido.estado}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
        </div>
      </div>
    </div>
  )
}
