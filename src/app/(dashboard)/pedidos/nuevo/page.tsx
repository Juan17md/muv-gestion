"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTiendas, crearTienda } from "@/lib/servicios/tiendas";
import { crearPedido } from "@/lib/servicios/pedidos";
import type { Tienda } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Package, Plus, Store } from "lucide-react";
import Link from "next/link";

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState("");
  const [modoNuevaTienda, setModoNuevaTienda] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await obtenerTiendas();
        setTiendas(data);
      } catch (error) {
        toast.error("Error al cargar tiendas");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const manejarCrear = async () => {
    let tiendaRef = "";
    let tiendaNombre = "";

    if (modoNuevaTienda) {
      if (!nuevaTiendaNombre.trim()) {
        toast.warning("Escribe el nombre de la tienda");
        return;
      }
      setEnviando(true);
      try {
        tiendaRef = await crearTienda({ nombre: nuevaTiendaNombre.trim() });
        tiendaNombre = nuevaTiendaNombre.trim();
      } catch (error) {
        toast.error("Error al crear la tienda");
        setEnviando(false);
        return;
      }
    } else {
      if (!tiendaSeleccionada) {
        toast.warning("Selecciona una tienda");
        return;
      }
      const tienda = tiendas.find((t) => t.id === tiendaSeleccionada);
      if (!tienda) return;
      tiendaRef = tienda.id;
      tiendaNombre = tienda.nombre;
    }

    setEnviando(true);
    try {
      const pedidoId = await crearPedido({
        tiendaRef,
        tiendaNombre,
      });
      toast.success("Pedido creado en borrador");
      router.push(`/pedidos/${pedidoId}`);
    } catch (error) {
      toast.error("Error al crear el pedido");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pedidos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo pedido</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona o crea una tienda para comenzar
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="size-5" />
            Tienda del pedido
          </CardTitle>
          <CardDescription>
            Cada pedido pertenece a una sola tienda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!modoNuevaTienda ? (
            <>
              <div className="space-y-1.5">
                <Label>Seleccionar tienda existente</Label>
                <Select
                  value={tiendaSeleccionada}
                  onValueChange={setTiendaSeleccionada}
                >
                  <SelectTrigger id="select-tienda-pedido">
                    <SelectValue placeholder="Elige una tienda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiendas.map((tienda) => (
                      <SelectItem key={tienda.id} value={tienda.id}>
                        {tienda.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setModoNuevaTienda(true)}
                  className="text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  O crea una nueva tienda
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nueva-tienda">Nombre de la nueva tienda</Label>
                <Input
                  id="nueva-tienda"
                  placeholder="Ej: Shein, Temu, AliExpress..."
                  value={nuevaTiendaNombre}
                  onChange={(e) => setNuevaTiendaNombre(e.target.value)}
                />
              </div>
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setModoNuevaTienda(false);
                    setNuevaTiendaNombre("");
                  }}
                  className="text-xs"
                >
                  Usar tienda existente
                </Button>
              </div>
            </>
          )}

          <Button
            onClick={manejarCrear}
            disabled={enviando}
            className="w-full"
            id="btn-crear-pedido"
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Package className="size-4 mr-1.5" />
            )}
            Crear pedido en borrador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
