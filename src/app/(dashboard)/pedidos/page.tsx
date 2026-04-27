"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Pedido, EstadoPedido } from "@/types";
import { ETIQUETAS_ESTADO, ESTADOS_PEDIDO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Package,
  ArrowRight,
  Calendar,
  Filter,
  Search,
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

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtrados, setFiltrados] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Pedido
        );
        setPedidos(data);
        setFiltrados(data);
      } catch (error) {
        console.error("Error cargando pedidos:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    let resultado = pedidos;

    if (filtroEstado !== "todos") {
      resultado = resultado.filter((p) => p.estado === filtroEstado);
    }

    if (busqueda.trim()) {
      const busq = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.tiendaNombre?.toLowerCase().includes(busq) ||
          p.id?.toLowerCase().includes(busq)
      );
    }

    setFiltrados(resultado);
  }, [filtroEstado, busqueda, pedidos]);

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Gestión
          </p>
          <h1 className="text-4xl font-heading text-foreground">Pedidos</h1>
        </div>
        <Button asChild size="sm" id="btn-nuevo-pedido" className="transition-smooth">
          <Link href="/pedidos/nuevo">
            <Plus className="size-4 mr-2" />
            Nuevo
          </Link>
        </Button>
      </div>

      {pedidos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up delay-75">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por tienda o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-smooth"
            />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full sm:w-48 h-10" id="filtro-estado-pedido">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS_PEDIDO.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {ETIQUETAS_ESTADO[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtrados.length === 0 && pedidos.length === 0 ? (
        <Card className="py-16 animate-fade-up delay-150">
          <CardContent className="flex flex-col items-center text-center">
            <Package className="size-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg font-heading text-foreground mb-2">
              Sin pedidos
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Comienza registrando tu primer pedido
            </p>
            <Button asChild size="sm">
              <Link href="/pedidos/nuevo">
                <Plus className="size-4 mr-2" />
                Crear pedido
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="py-12 animate-fade-up delay-150">
          <CardContent className="flex flex-col items-center text-center">
            <Filter className="size-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              Sin pedidos con estado &quot;{ETIQUETAS_ESTADO[filtroEstado as EstadoPedido]}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((pedido, index) => (
            <Link
              key={pedido.id}
              href={`/pedidos/${pedido.id}`}
              className="block animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="hover:shadow-elevation transition-smooth group cursor-pointer">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center size-12 rounded-lg bg-secondary shrink-0">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-base font-medium truncate">
                          {pedido.tiendaNombre}
                        </p>
                        <Badge
                          variant="secondary"
                          className={COLORES_ESTADO[pedido.estado]}
                        >
                          {ETIQUETAS_ESTADO[pedido.estado]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {pedido.fechaCreacion?.toDate?.()
                            ? new Intl.DateTimeFormat("es", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(pedido.fechaCreacion.toDate())
                            : "—"}
                        </span>
                        {pedido.montoTotal !== undefined && (
                          <span className="font-medium">
                            ${pedido.montoTotal.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth shrink-0 ml-3" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground animate-fade-up delay-300">
        {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} registrado
        {pedidos.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}