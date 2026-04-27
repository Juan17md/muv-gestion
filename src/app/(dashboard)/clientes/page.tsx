"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaCliente, type DatosCliente } from "@/lib/schemas";
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from "@/lib/servicios/clientes";
import type { Cliente } from "@/types";
import {
  Card,
  CardContent,
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
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  MessageCircle,
  Search,
  ShoppingBag,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { collectionGroup, query as firestoreQuery, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { ESTADOS_PAGO, ETIQUETAS_PAGO, ETIQUETAS_ESTADO, type ProductoPedido, type Pedido } from "@/types";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtrados, setFiltrados] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  // Estados para Historial
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [historialCliente, setHistorialCliente] = useState<Cliente | null>(null);
  const [historialItems, setHistorialItems] = useState<{producto: ProductoPedido, pedido: Pedido}[]>([]);
  const [historialCargando, setHistorialCargando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosCliente>({
    resolver: zodResolver(esquemaCliente),
  });

  const cargarClientes = async () => {
    try {
      const data = await obtenerClientes();
      setClientes(data);
      setFiltrados(data);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (!busqueda.trim()) {
      setFiltrados(clientes);
    } else {
      const termino = busqueda.toLowerCase();
      setFiltrados(
        clientes.filter((c) => c.nombre.toLowerCase().includes(termino))
      );
    }
  }, [busqueda, clientes]);

  const abrirDialogo = (cliente?: Cliente) => {
    if (cliente) {
      setClienteEditar(cliente);
      reset({
        nombre: cliente.nombre,
        whatsapp: cliente.whatsapp,
        notas: cliente.notas || "",
      });
    } else {
      setClienteEditar(null);
      reset({ nombre: "", whatsapp: "", notas: "" });
    }
    setDialogoAbierto(true);
  };

  const onSubmit = async (datos: DatosCliente) => {
    try {
      if (clienteEditar) {
        await actualizarCliente(clienteEditar.id, datos);
        toast.success("Cliente actualizado");
      } else {
        await crearCliente(datos);
        toast.success("Cliente registrado");
      }
      setDialogoAbierto(false);
      reset();
      cargarClientes();
    } catch (error) {
      toast.error("Error al guardar el cliente");
    }
  };

  const manejarEliminar = async (id: string) => {
    setEliminando(id);
    try {
      await eliminarCliente(id);
      toast.success("Cliente eliminado");
      cargarClientes();
    } catch (error) {
      toast.error("Error al eliminar el cliente");
    } finally {
      setEliminando(null);
    }
  };

  const abrirHistorial = async (cliente: Cliente) => {
    setHistorialCliente(cliente);
    setHistorialAbierto(true);
    setHistorialCargando(true);
    try {
      // Buscar todos los productos donde clienteNombre o clienteRef coincida
      // Nota: Si el nombre del cliente se actualizó, podría diferir en pedidos viejos. 
      // Por consistencia usamos nombre o ref, pero como no indexamos clienteRef obligatoriamente en el pasado, usamos nombre.
      const q = firestoreQuery(
        collectionGroup(db, "productos"),
        where("clienteNombre", "==", cliente.nombre)
      );
      
      const snap = await getDocs(q);
      const items: {producto: ProductoPedido, pedido: Pedido}[] = [];
      
      // Necesitamos agrupar llamadas a getDoc para no repetir lectura del mismo pedido
      const cachePedidos = new Map<string, Pedido>();

      for (const documento of snap.docs) {
        const prod = { id: documento.id, ...documento.data() } as ProductoPedido;
        // El path del documento es "pedidos/{pedidoId}/productos/{prodId}"
        const refPedido = documento.ref.parent.parent;
        if (!refPedido) continue;

        let pedido = cachePedidos.get(refPedido.id);
        if (!pedido) {
          const pedSnap = await getDoc(refPedido);
          if (pedSnap.exists()) {
            pedido = { id: pedSnap.id, ...pedSnap.data() } as Pedido;
            cachePedidos.set(refPedido.id, pedido);
          }
        }

        if (pedido) {
          items.push({ producto: prod, pedido });
        }
      }

      // Ordenar por fecha del pedido descendente
      items.sort((a, b) => {
        const tA = a.pedido.fechaCreacion?.toMillis() || 0;
        const tB = b.pedido.fechaCreacion?.toMillis() || 0;
        return tB - tA;
      });

      setHistorialItems(items);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar historial");
    } finally {
      setHistorialCargando(false);
    }
  };

  const formatearWhatsApp = (numero: string) => {
    return numero.replace(/[^\d+]/g, "");
  };

  if (cargando) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
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
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}{" "}
            registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => abrirDialogo()} id="btn-nuevo-cliente">
              <Plus className="size-4 mr-1.5" />
              Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {clienteEditar ? "Editar cliente" : "Nuevo cliente"}
              </DialogTitle>
              <DialogDescription>
                {clienteEditar
                  ? "Modifica los datos del cliente"
                  : "Registra un nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre-cliente">Nombre</Label>
                <Input
                  id="nombre-cliente"
                  placeholder="Nombre del cliente"
                  {...register("nombre")}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">
                    {errors.nombre.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp-cliente">WhatsApp</Label>
                <Input
                  id="whatsapp-cliente"
                  placeholder="+58 412 123 4567"
                  {...register("whatsapp")}
                />
                {errors.whatsapp && (
                  <p className="text-xs text-destructive">
                    {errors.whatsapp.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notas-cliente">Notas (opcional)</Label>
                <Input
                  id="notas-cliente"
                  placeholder="Observaciones del cliente..."
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
                <Button type="submit" disabled={isSubmitting} id="btn-guardar-cliente">
                  {isSubmitting && (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  )}
                  {clienteEditar ? "Guardar cambios" : "Registrar cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Búsqueda */}
      {clientes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
            id="input-buscar-cliente"
          />
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 && clientes.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center">
            <Users className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No hay clientes registrados
            </p>
            <Button size="sm" onClick={() => abrirDialogo()}>
              <Plus className="size-4 mr-1.5" />
              Registrar primer cliente
            </Button>
          </CardContent>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center">
            <Search className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No se encontraron resultados para &quot;{busqueda}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((cliente) => (
            <Card
              key={cliente.id}
              className="group hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-9 rounded-full bg-primary/10">
                    <span className="text-sm font-semibold text-primary">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <CardTitle className="text-base">{cliente.nombre}</CardTitle>
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
                    <DropdownMenuItem onClick={() => abrirHistorial(cliente)}>
                      <ShoppingBag className="size-4 mr-2" />
                      Ver historial
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => abrirDialogo(cliente)}>
                      <Pencil className="size-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => manejarEliminar(cliente.id)}
                      disabled={eliminando === cliente.id}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href={`https://wa.me/${formatearWhatsApp(cliente.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  <MessageCircle className="size-3.5" />
                  {cliente.whatsapp}
                </a>
                {cliente.notas && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cliente.notas}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet de Historial */}
      <Sheet open={historialAbierto} onOpenChange={setHistorialAbierto}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle>Historial de Compras</SheetTitle>
            <SheetDescription>
              {historialCliente?.nombre}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            {historialCargando ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : historialItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <ShoppingBag className="size-10 opacity-20 mb-3" />
                <p className="text-sm">No hay compras registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium">Total de items:</span>
                  <span className="text-sm font-semibold">{historialItems.length}</span>
                </div>
                {historialItems.map((item) => (
                  <div key={item.producto.id} className="p-3 border border-border rounded-lg bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm line-clamp-1">{item.producto.nombre}</div>
                      <div className="text-sm font-semibold">
                        ${((item.producto.precioUnitario + item.producto.margen) * item.producto.cantidad + (item.producto.envioCliente || 0)).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                      <div>
                        {item.producto.cantidad}x ${item.producto.precioUnitario} + ${item.producto.margen} margen
                        {item.producto.envioCliente ? ` + $${item.producto.envioCliente} envío` : ""}
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-normal">
                          {ETIQUETAS_PAGO[item.producto.estadoPago]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {ETIQUETAS_ESTADO[item.pedido.estado]}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.pedido.fechaCreacion?.toDate().toLocaleDateString("es-ES")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
