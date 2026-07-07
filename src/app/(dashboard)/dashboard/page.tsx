"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, calcularDiasEstancado, ESTADOS_PEDIDO, ESTADOS_ARTICULO, ESTATUS_PAGO_VENTA, ESTATUS_ENTREGA, cn } from "@/lib/utils"
import { DIAS_ESTANCAMIENTO } from "@/lib/constants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  DollarSign,
  TrendingUp,
  Truck,
  ShoppingBag,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShoppingCart,
  Store,
  Users,
  BarChart3,
  Receipt,
  MessageCircle,
} from "lucide-react"
import type { Pedido, ProductoPedido, Venta, ArticuloTienda } from "@/lib/types"

export default function DashboardGlobalPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [articulos, setArticulos] = useState<ArticuloTienda[]>([])
  const [loading, setLoading] = useState(true)
  const [productosPorPedido, setProductosPorPedido] = useState<Record<string, ProductoPedido[]>>({})

  useEffect(() => {
    const unsubPedidos = onSnapshot(
      query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc")),
      async (snap) => {
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
      }
    )

    const unsubVentas = onSnapshot(
      query(collection(db, "ventas"), orderBy("creadoEn", "desc")),
      (snap) => {
        setVentas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta)))
      }
    )

    const unsubArticulos = onSnapshot(
      query(collection(db, "inventario"), orderBy("creadoEn", "desc")),
      (snap) => {
        setArticulos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticuloTienda)))
      }
    )

    return () => { unsubPedidos(); unsubVentas(); unsubArticulos() }
  }, [])

  const pedidosActivos = pedidos.filter((p) => p.estado !== "cerrado")
  const enTransito = pedidos.filter(
    (p) => p.estado === "transito_china_usa" || p.estado === "transito_usa_ven"
  )
  const enStock = articulos.filter((a) => a.estado === "en_stock")
  const stockBajo = enStock.filter((a) => a.cantidad <= 2)
  const vendidos = articulos.filter((a) => a.estado === "vendido")
  const totalVendido = vendidos.reduce((s, a) => s + a.precioVenta * a.cantidad, 0)

  const totalPendiente = Object.entries(productosPorPedido).reduce((sum, [, prods]) => {
    return (
      sum +
      prods
        .filter((pr) => pr.estadoPago !== "pagado")
        .reduce((s, pr) => s + (pr.precioUnitario * pr.cantidad + (pr.margen || 0) - (pr.montoPagado || 0)), 0)
    )
  }, 0)

  const porCobrarVentas = ventas.filter((v) => v.estatusPago === "por_pagar")
  const totalPorCobrarVentas = porCobrarVentas.reduce((s, v) => s + v.precioVenta * v.cantidad, 0)

  const gananciasPedidos = pedidos.reduce((sum, p) => sum + (p.gananciaTotal || 0), 0)
  const totalInvertido = articulos.reduce((s, a) => s + a.costo * a.cantidad, 0)
  const totalVentaArticulos = articulos.reduce((s, a) => s + a.precioVenta * a.cantidad, 0)
  const gananciaPotencial = totalVentaArticulos - totalInvertido

  const metricas = [
    { icon: Package, label: "Pedidos Activos", valor: pedidosActivos.length.toString(), color: "text-blue-600" },
    { icon: ShoppingBag, label: "En Stock", valor: `${enStock.length}`, color: "text-emerald-600", sub: `${stockBajo.length} con stock bajo` },
    { icon: DollarSign, label: "Por Cobrar", valor: formatearMoneda(totalPendiente + totalPorCobrarVentas), color: "text-yellow-600" },
    { icon: TrendingUp, label: "Ganancia Total", valor: formatearMoneda(gananciasPedidos + gananciaPotencial), color: "text-primary" },
  ]

  const pedidosRecientes = pedidos.slice(0, 5)
  const ventasRecientes = ventas.slice(0, 5)
  const articulosRecientes = articulos.slice(0, 5)

  return (
    <div className="page-container space-y-10 animate-fade-in">
      <div>
        <p className="typography-label text-primary">Visión general</p>
        <h1 className="typography-title-premium">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map(({ icon: Icon, label, valor, color, sub }) => (
          <Card key={label} className="card-glow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">{label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <>
                      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
                      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                    </>
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

      {(pedidosActivos.filter((p) => calcularDiasEstancado(p.actualizadoEn) > DIAS_ESTANCAMIENTO).length > 0 || stockBajo.length > 0) && (
        <div className="space-y-3">
          {pedidosActivos.filter((p) => calcularDiasEstancado(p.actualizadoEn) > DIAS_ESTANCAMIENTO).length > 0 && (
            <div className="glass-panel p-5 border-l-4 border-l-warning">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-semibold">Pedidos Estancados</p>
                  <p className="text-sm text-muted-foreground">
                    {pedidosActivos.filter((p) => calcularDiasEstancado(p.actualizadoEn) > DIAS_ESTANCAMIENTO).length} pedidos sin actualizar en más de {DIAS_ESTANCAMIENTO} días
                  </p>
                </div>
              </div>
            </div>
          )}
          {stockBajo.length > 0 && (
            <div className="glass-panel p-5 border-l-4 border-l-warning">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-semibold">Stock Bajo</p>
                  <p className="text-sm text-muted-foreground">
                    {stockBajo.length} artículo{stockBajo.length > 1 ? "s" : ""} con 2 o menos unidades — {stockBajo.map((a) => a.nombre).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href="/pedidos/nuevo" className="card-glow rounded-xl p-6 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Nuevo Pedido</p>
              <p className="text-sm text-muted-foreground">Crear un pedido de importación</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary ml-auto shrink-0" />
          </div>
        </Link>
        <Link href="/tienda" className="card-glow rounded-xl p-6 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Panel de Tienda</p>
              <p className="text-sm text-muted-foreground">Gestionar inventario y ventas</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary ml-auto shrink-0" />
          </div>
        </Link>
        <Link href="/clientes" className="card-glow rounded-xl p-6 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Clientes</p>
              <p className="text-sm text-muted-foreground">Ver y gestionar clientes</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary ml-auto shrink-0" />
          </div>
        </Link>
        <Link href="/inventario" className="card-glow rounded-xl p-6 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Inventario</p>
              <p className="text-sm text-muted-foreground">Gestionar artículos en stock</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary ml-auto shrink-0" />
          </div>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Pedidos Recientes</h2>
          <Link href="/pedidos/panel" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tienda</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosRecientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No hay pedidos recientes
                  </TableCell>
                </TableRow>
              ) : pedidosRecientes.map((p) => {
                const estadoInfo = ESTADOS_PEDIDO.find((e) => e.valor === p.estado)
                const items = productosPorPedido[p.id] || []
                const totalProd = items.reduce((s, pr) => s + pr.cantidad, 0)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.tiendaNombre}</TableCell>
                    <TableCell>{totalProd}</TableCell>
                    <TableCell className="text-muted-foreground">{formatearFecha(p.fechaCreacion)}</TableCell>
                    <TableCell>
                      <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>
                        {estadoInfo?.etiqueta || p.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Últimas Ventas</h2>
            <Link href="/ventas" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasRecientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Sin ventas recientes
                    </TableCell>
                  </TableRow>
                ) : ventasRecientes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.articuloNombre}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">
                      {formatearMoneda(v.precioVenta * v.cantidad)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-[10px]", v.estatusPago === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700")}>
                        {v.estatusPago === "pagado" ? "Pagado" : "Por pagar"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Últimos Artículos</h2>
            <Link href="/inventario" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articulosRecientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Sin artículos recientes
                    </TableCell>
                  </TableRow>
                ) : articulosRecientes.map((a) => {
                  const estadoInfo = ESTADOS_ARTICULO.find((e) => e.valor === a.estado)
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell>{a.cantidad}</TableCell>
                      <TableCell>
                        <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>
                          {estadoInfo?.etiqueta || a.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
