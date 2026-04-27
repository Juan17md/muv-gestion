"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaTienda, type DatosTienda } from "@/lib/schemas";
import {
  obtenerTiendas,
  crearTienda,
  actualizarTienda,
  eliminarTienda,
} from "@/lib/servicios/tiendas";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Store,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Package,
} from "lucide-react";

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [tiendaEditar, setTiendaEditar] = useState<Tienda | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosTienda>({
    resolver: zodResolver(esquemaTienda),
  });

  const cargarTiendas = async () => {
    try {
      const data = await obtenerTiendas();
      setTiendas(data);
    } catch (error) {
      toast.error("Error al cargar tiendas");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTiendas();
  }, []);

  const abrirDialogo = (tienda?: Tienda) => {
    if (tienda) {
      setTiendaEditar(tienda);
      reset({ nombre: tienda.nombre, notas: tienda.notas || "" });
    } else {
      setTiendaEditar(null);
      reset({ nombre: "", notas: "" });
    }
    setDialogoAbierto(true);
  };

  const onSubmit = async (datos: DatosTienda) => {
    try {
      if (tiendaEditar) {
        await actualizarTienda(tiendaEditar.id, datos);
        toast.success("Tienda actualizada");
      } else {
        await crearTienda(datos);
        toast.success("Tienda creada");
      }
      setDialogoAbierto(false);
      reset();
      cargarTiendas();
    } catch (error) {
      toast.error("Error al guardar la tienda");
    }
  };

  const manejarEliminar = async (id: string) => {
    setEliminando(id);
    try {
      await eliminarTienda(id);
      toast.success("Tienda eliminada");
      cargarTiendas();
    } catch (error) {
      toast.error("Error al eliminar la tienda");
    } finally {
      setEliminando(null);
    }
  };

  if (cargando) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tiendas</h1>
          <p className="text-sm text-muted-foreground">
            {tiendas.length} tienda{tiendas.length !== 1 ? "s" : ""} registrada
            {tiendas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => abrirDialogo()} id="btn-nueva-tienda">
              <Plus className="size-4 mr-1.5" />
              Nueva tienda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tiendaEditar ? "Editar tienda" : "Nueva tienda"}
              </DialogTitle>
              <DialogDescription>
                {tiendaEditar
                  ? "Modifica los datos de la tienda"
                  : "Registra una nueva tienda online"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre-tienda">Nombre</Label>
                <Input
                  id="nombre-tienda"
                  placeholder="Ej: Shein, Temu, AliExpress..."
                  {...register("nombre")}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">
                    {errors.nombre.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notas-tienda">Notas (opcional)</Label>
                <Input
                  id="notas-tienda"
                  placeholder="Observaciones sobre la tienda..."
                  {...register("notas")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogoAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} id="btn-guardar-tienda">
                  {isSubmitting && (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  )}
                  {tiendaEditar ? "Guardar cambios" : "Crear tienda"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      {tiendas.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center">
            <Store className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No hay tiendas registradas
            </p>
            <Button size="sm" onClick={() => abrirDialogo()}>
              <Plus className="size-4 mr-1.5" />
              Crear primera tienda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tiendas.map((tienda) => (
            <Card
              key={tienda.id}
              className="group hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
                    <Store className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{tienda.nombre}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => abrirDialogo(tienda)}>
                      <Pencil className="size-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => manejarEliminar(tienda.id)}
                      disabled={eliminando === tienda.id}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {tienda.notas ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tienda.notas}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">
                    Sin notas
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
