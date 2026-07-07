"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatearMoneda, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShoppingBag,
} from "lucide-react"
import type { ArticuloTienda } from "@/lib/types"
import RegistrarVentaDialog from "@/components/RegistrarVentaDialog"

export default function TiendaDashboard() {
  const [articulos, setArticulos] = useState<ArticuloTienda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "inventario"), orderBy("creadoEn", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setArticulos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticuloTienda)))
      setLoading(false)
    })
    return unsub
  }, [])

  const enStock = articulos.filter((a) => a.estado === "en_stock")
  const vendidos = articulos.filter((a) => a.estado === "vendido")
  const apartados = articulos.filter((a) => a.estado === "apartado")
  const stockBajo = enStock.filter((a) => a.cantidad <= 2)

  const totalInvertido = articulos.reduce((s, a) => s + a.costo * a.cantidad, 0)
  const totalVenta = articulos.reduce((s, a) => s + a.precioVenta * a.cantidad, 0)
  const gananciaPotencial = totalVenta - totalInvertido

  const metricas = [
    { icon: Package, label: "En Stock", valor: enStock.length.toString(), color: "text-emerald-600", sub: `${enStock.reduce((s, a) => s + a.cantidad, 0)} unidades` },
    { icon: TrendingUp, label: "Vendidos", valor: vendidos.length.toString(), color: "text-blue-600", sub: `${apartados.length} apartados` },
    { icon: DollarSign, label: "Invertido", valor: formatearMoneda(totalInvertido), color: "text-yellow-600", sub: `${articulos.length} artículos` },
    { icon: BarChart3, label: "Ganancia Potencial", valor: formatearMoneda(gananciaPotencial), color: "text-primary", sub: `${((gananciaPotencial / (totalInvertido || 1)) * 100).toFixed(0)}% margen` },
  ]

  const recientes = articulos.slice(0, 5)

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
          <h2 className="text-xl font-bold tracking-tight">Artículos Recientes</h2>
          <Link
            href="/inventario"
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ver inventario completo <ArrowRight className="h-3 w-3" />
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
            : recientes.map((a, i) => (
                <Card key={a.id} className={cn("card-glow animate-fade-up")} style={{ animationDelay: `${i * 75}ms` }}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold">{a.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatearMoneda(a.precioVenta)} · Stock: {a.cantidad}
                          {a.clienteNombre && ` · ${a.clienteNombre}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        a.estado === "en_stock" && "bg-emerald-100 text-emerald-700",
                        a.estado === "vendido" && "bg-blue-100 text-blue-700",
                        a.estado === "apartado" && "bg-yellow-100 text-yellow-700"
                      )}
                    >
                      {a.estado === "en_stock" ? "Stock" : a.estado === "vendido" ? "Vendido" : "Apartado"}
                    </span>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </div>
  )
}
