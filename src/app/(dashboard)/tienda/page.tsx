"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatearMoneda, formatearFecha, ESTATUS_PAGO_VENTA, ESTATUS_ENTREGA, ESTADOS_ARTICULO, cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Plus,
  ArrowRight,
  Receipt,
  MessageCircle,
} from "lucide-react"
import type { ArticuloTienda, Venta } from "@/lib/types"
import RegistrarVentaDialog from "@/components/RegistrarVentaDialog"

export default function TiendaDashboard() {
  const [articulos, setArticulos] = useState<ArticuloTienda[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubArticulos = onSnapshot(
      query(collection(db, "inventario"), orderBy("creadoEn", "desc")),
      (snap) => {
        setArticulos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticuloTienda)))
        setLoading(false)
      }
    )

    const unsubVentas = onSnapshot(
      query(collection(db, "ventas"), orderBy("creadoEn", "desc")),
      (snap) => {
        setVentas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta)))
      }
    )

    return () => { unsubArticulos(); unsubVentas() }
  }, [])

  const enStock = articulos.filter((a) => a.estado === "en_stock")
  const vendidos = articulos.filter((a) => a.estado === "vendido")
  const apartados = articulos.filter((a) => a.estado === "apartado")
  const stockBajo = enStock.filter((a) => a.cantidad <= 2)

  const porCobrar = ventas.filter((v) => v.estatusPago === "por_pagar")
  const totalPorCobrar = porCobrar.reduce((s, v) => s + v.precioVenta * v.cantidad, 0)

  const totalInvertido = articulos.reduce((s, a) => s + a.costo * a.cantidad, 0)
  const totalVenta = articulos.reduce((s, a) => s + a.precioVenta * a.cantidad, 0)
  const gananciaPotencial = totalVenta - totalInvertido

  const metricas = [
    { icon: Package, label: "En Stock", valor: enStock.length.toString(), color: "text-emerald-600", sub: `${enStock.reduce((s, a) => s + a.cantidad, 0)} unidades` },
    { icon: TrendingUp, label: "Vendidos", valor: vendidos.length.toString(), color: "text-blue-600", sub: `${apartados.length} apartados` },
    { icon: Receipt, label: "Por Cobrar", valor: porCobrar.length.toString(), color: "text-yellow-600", sub: `${formatearMoneda(totalPorCobrar)}` },
    { icon: BarChart3, label: "Ganancia Potencial", valor: formatearMoneda(gananciaPotencial), color: "text-primary", sub: `${((gananciaPotencial / (totalInvertido || 1)) * 100).toFixed(0)}% margen` },
  ]

  return (
    <div className="page-container space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Mi tienda</p>
          <h1 className="typography-title-premium">Panel de Tienda</h1>
        </div>
        <div className="flex items-center gap-3">
          <RegistrarVentaDialog articulosEnStock={enStock} />
          <Link href="/inventario">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Gestionar inventario
            </Button>
          </Link>
        </div>
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
                      <p className="text-xs text-muted-foreground">{sub}</p>
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

      {stockBajo.length > 0 && (
        <div className="glass-panel p-5 border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-semibold">Stock Bajo</p>
              <p className="text-sm text-muted-foreground">
                {stockBajo.length} artículo{stockBajo.length > 1 ? "s" : ""} con 2 o menos unidades
                — {stockBajo.map((a) => a.nombre).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Últimas Ventas</h2>
          <Link
            href="/ventas"
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Entrega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Receipt className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay ventas registradas</p>
                  </TableCell>
                </TableRow>
              ) : (
                ventas.slice(0, 10).map((venta) => {
                  const estatusPago = ESTATUS_PAGO_VENTA.find((e) => e.valor === venta.estatusPago)
                  const entregaInfo = ESTATUS_ENTREGA.find((e) => e.valor === venta.estatusEntrega)
                  return (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.articuloNombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{venta.clienteNombre}</span>
                          {venta.clienteWhatsapp && (
                            <button
                              onClick={() => window.open(`https://wa.me/${venta.clienteWhatsapp}`, "_blank")}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{venta.cantidad}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">
                        {formatearMoneda(venta.precioVenta * venta.cantidad)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "border-0 text-[10px]",
                          venta.estatusPago === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {estatusPago?.etiqueta || "Por pagar"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "border-0 text-[10px]",
                          venta.estatusEntrega === "entregado" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {entregaInfo?.etiqueta || "Por entregar"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Artículos Recientes</h2>
          <Link
            href="/inventario"
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ver inventario completo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articulos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Package className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay artículos en el inventario</p>
                  </TableCell>
                </TableRow>
              ) : (
                articulos.slice(0, 10).map((articulo) => {
                  const estadoInfo = ESTADOS_ARTICULO.find((e) => e.valor === articulo.estado)
                  return (
                    <TableRow key={articulo.id}>
                      <TableCell className="font-medium">{articulo.nombre}</TableCell>
                      <TableCell>{articulo.cantidad}</TableCell>
                      <TableCell className="text-amber-600 font-medium">{formatearMoneda(articulo.costo)}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">{formatearMoneda(articulo.precioVenta)}</TableCell>
                      <TableCell>
                        <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>
                          {estadoInfo?.etiqueta || articulo.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
