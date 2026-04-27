"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Pedido, EstadoPedido } from "@/types";
import { ETIQUETAS_ESTADO } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  TrendingUp,
  Truck,
  Plus,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  borrador: "bg-muted text-muted-foreground",
  comprado: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  transito_china_usa: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  casillero_usa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  transito_usa_ven: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  entregado_ven: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  entregado_cliente: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cerrado: "bg-muted text-muted-foreground",
};

interface MetricasDashboard {
  pedidosActivos: number;
  pedidosPorEstado: Partial<Record<EstadoPedido, number>>;
  gananciasMes: number;
  productosEnTransito: number;
  estancados: Pedido[];
}

function CardMetrica({
  titulo,
  valor,
  icono: Icono,
  descripcion,
}: {
  titulo: string;
  valor: string | number;
  icono: React.ComponentType<{ className?: string }>;
  descripcion?: string;
}) {
  return (
    <Card className="card-glow hover:shadow-elevation transition-smooth">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <Icono className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-heading">{valor}</div>
        {descripcion && (
          <p className="text-xs text-muted-foreground mt-1">{descripcion}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pedidosRecientes, setPedidosRecientes] = useState<Pedido[]>([]);

  useEffect(() => {
    const cargarMetricas = async () => {
      try {
        const pedidosSnap = await getDocs(
          query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
        );
        const pedidos = pedidosSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Pedido
        );

        const activos = pedidos.filter((p) => p.estado !== "cerrado");

        const porEstado: Partial<Record<EstadoPedido, number>> = {};
        for (const p of activos) {
          porEstado[p.estado] = (porEstado[p.estado] || 0) + 1;
        }

        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const gananciasMes = pedidos
          .filter((p) => {
            if (!p.fechaCierre) return false;
            const fecha = p.fechaCierre.toDate();
            return fecha >= inicioMes;
          })
          .reduce((sum, p) => sum + (p.gananciaTotal || 0), 0);

        const enTransito = pedidos.filter(
          (p) => p.estado === "transito_china_usa" || p.estado === "transito_usa_ven"
        ).length;

        const sieteDiasAtras = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const estancados = activos.filter((p) => {
          if (!p.actualizadoEn) return false;
          return p.actualizadoEn.toDate() < sieteDiasAtras;
        });

        setMetricas({
          pedidosActivos: activos.length,
          pedidosPorEstado: porEstado,
          gananciasMes,
          productosEnTransito: enTransito,
          estancados: estancados,
        });

        setPedidosRecientes(pedidos.slice(0, 5));
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarMetricas();
  }, []);

  if (cargando) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Dashboard
          </p>
          <h1 className="text-4xl font-heading text-foreground">Resumen</h1>
        </div>
        <Button asChild size="sm" id="btn-nuevo-pedido-dash" className="transition-smooth">
          <Link href="/pedidos/nuevo">
            <Plus className="size-4 mr-2" />
            Nuevo
          </Link>
        </Button>
      </div>

      {metricas && metricas.estancados.length > 0 && (
        <div className="bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg animate-fade-up delay-75">
          <div className="flex items-start">
            <AlertTriangle className="size-5 text-destructive mt-0.5 mr-3 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-destructive">
                Pedidos sin actualizar
              </h3>
              <p className="text-sm text-destructive/80 mt-1">
                Hay {metricas.estancados.length} pedido
                {metricas.estancados.length > 1 ? "s" : ""} con más de 7 días sin cambios.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {metricas.estancados.map((p) => (
                  <Link key={p.id} href={`/pedidos/${p.id}`}>
                    <Badge
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                    >
                      {p.tiendaNombre}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-up delay-150">
        <CardMetrica
          titulo="Pedidos activos"
          valor={metricas?.pedidosActivos || 0}
          icono={Package}
          descripcion={Object.values(metricas?.pedidosPorEstado || {})
            .reduce((a, b) => a + b, 0) + " total"}
        />
        <CardMetrica
          titulo="Este mes"
          valor={`$${(metricas?.gananciasMes || 0).toFixed(0)}`}
          icono={TrendingUp}
          descripcion="USD ganados"
        />
        <CardMetrica
          titulo="En tránsito"
          valor={metricas?.productosEnTransito || 0}
          icono={Truck}
          descripcion="moviéndose"
        />
        <CardMetrica
          titulo="Pendientes"
          valor={metricas?.pedidosPorEstado?.borrador || 0}
          icono={Clock}
          descripcion="borrador"
        />
      </div>

      <Card className="animate-fade-up delay-225 card-glow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Pedidos recientes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos registros</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pedidos">
              Ver todos
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pedidosRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="size-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">Sin pedidos aún</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/pedidos/nuevo">Crear primer pedido</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosRecientes.map((pedido) => (
                <Link
                  key={pedido.id}
                  href={`/pedidos/${pedido.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-smooth group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pedido.tiendaNombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pedido.fechaCreacion?.toDate?.()
                        ? new Intl.DateTimeFormat("es", {
                            day: "numeric",
                            month: "short",
                          }).format(pedido.fechaCreacion.toDate())
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={COLORES_ESTADO[pedido.estado]}
                    >
                      {ETIQUETAS_ESTADO[pedido.estado]}
                    </Badge>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}