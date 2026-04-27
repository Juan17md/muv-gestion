"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaProducto, type DatosProducto } from "@/lib/schemas";
import {
  obtenerPedido,
  obtenerProductosPedido,
  agregarProducto,
  actualizarProducto,
  eliminarProducto,
  avanzarEstadoPedido,
  eliminarPedido,
  recalcularTotalesPedido,
} from "@/lib/servicios/pedidos";
import { obtenerClientes } from "@/lib/servicios/clientes";
import type {
  Pedido,
  ProductoPedido,
  Cliente,
  EstadoPedido,
  EstadoPago,
} from "@/types";
import {
  ETIQUETAS_ESTADO,
  ETIQUETAS_PAGO,
  ESTADOS_PEDIDO,
  TRANSICIONES_PERMITIDAS,
  ESTADO_A_UBICACION,
} from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  Loader2,
  MessageCircle,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Colores de Estado ───
const COLORES_ESTADO: Record<EstadoPedido, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  comprado: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  transito_china_usa:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  casillero_usa:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  transito_usa_ven:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  entregado_ven:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  entregado_cliente:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cerrado:
    "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

const COLORES_PAGO: Record<EstadoPago, string> = {
  sin_pagar:
    "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  parcial:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  pagado:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
};

// ─── Timeline Visual ───
function TimelinePedido({ estadoActual }: { estadoActual: EstadoPedido }) {
  const indiceActual = ESTADOS_PEDIDO.indexOf(estadoActual);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[600px] px-2 py-4">
        {ESTADOS_PEDIDO.map((estado, i) => {
          const completado = i < indiceActual;
          const activo = i === indiceActual;

          return (
            <div key={estado} className="flex items-center flex-1 last:flex-0">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    completado &&
                      "bg-primary text-primary-foreground",
                    activo &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !completado &&
                      !activo &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {completado ? (
                    <Check className="size-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] mt-1.5 text-center max-w-16 leading-tight",
                    activo
                      ? "text-primary font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {ETIQUETAS_ESTADO[estado].replace("En Tránsito ", "").replace("En Casillero ", "Casillero ")}
                </span>
              </div>
              {i < ESTADOS_PEDIDO.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1",
                    i < indiceActual ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [productos, setProductos] = useState<ProductoPedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogoProducto, setDialogoProducto] = useState(false);
  const [productoEditar, setProductoEditar] = useState<ProductoPedido | null>(
    null
  );
  const [avanzandoEstado, setAvanzandoEstado] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<DatosProducto>({
    resolver: zodResolver(esquemaProducto) as any,
  });

  const cargarDatos = async () => {
    try {
      const [pedidoData, productosData, clientesData] = await Promise.all([
        obtenerPedido(id),
        obtenerProductosPedido(id),
        obtenerClientes(),
      ]);
      setPedido(pedidoData);
      setProductos(productosData);
      setClientes(clientesData);
    } catch (error) {
      toast.error("Error al cargar el pedido");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const abrirDialogoProducto = (producto?: ProductoPedido) => {
    if (producto) {
      setProductoEditar(producto);
      reset({
        nombre: producto.nombre,
        cantidad: producto.cantidad,
        precioUnitario: producto.precioUnitario,
        margen: producto.margen,
        envioCliente: producto.envioCliente || 0,
        clienteNombre: producto.clienteNombre,
        clienteRef: producto.clienteRef || "",
      });
    } else {
      setProductoEditar(null);
      reset({
        nombre: "",
        cantidad: 1,
        precioUnitario: 0,
        margen: 0,
        envioCliente: 0,
        clienteNombre: "",
        clienteRef: "",
      });
    }
    setDialogoProducto(true);
  };

  const onSubmitProducto = async (datos: DatosProducto) => {
    try {
      const productoData = {
        ...datos,
        estadoPago: "sin_pagar" as EstadoPago,
        montoPagado: 0,
      };

      if (productoEditar) {
        await actualizarProducto(id, productoEditar.id, datos);
        toast.success("Producto actualizado");
      } else {
        await agregarProducto(id, productoData);
        toast.success("Producto agregado al pedido");
      }

      await recalcularTotalesPedido(id);
      setDialogoProducto(false);
      reset();
      cargarDatos();
    } catch (error) {
      toast.error("Error al guardar el producto");
    }
  };

  const manejarEliminarProducto = async (productoId: string) => {
    try {
      await eliminarProducto(id, productoId);
      await recalcularTotalesPedido(id);
      toast.success("Producto eliminado");
      cargarDatos();
    } catch (error) {
      toast.error("Error al eliminar el producto");
    }
  };

  const manejarCambioPago = async (
    productoId: string,
    nuevoEstado: EstadoPago,
    montoTotal: number
  ) => {
    try {
      const montoPagado =
        nuevoEstado === "pagado"
          ? montoTotal
          : nuevoEstado === "parcial"
          ? montoTotal * 0.5
          : 0;

      await actualizarProducto(id, productoId, {
        estadoPago: nuevoEstado,
        montoPagado,
      });
      toast.success(`Pago marcado como ${ETIQUETAS_PAGO[nuevoEstado]}`);
      cargarDatos();
    } catch (error) {
      toast.error("Error al actualizar el pago");
    }
  };

  const manejarAvanzarEstado = async () => {
    if (!pedido) return;
    const siguiente = TRANSICIONES_PERMITIDAS[pedido.estado];
    if (!siguiente) return;

    setAvanzandoEstado(true);
    try {
      await avanzarEstadoPedido(
        id,
        siguiente,
        ESTADO_A_UBICACION[siguiente]
      );
      toast.success(`Estado cambiado a: ${ETIQUETAS_ESTADO[siguiente]}`);
      cargarDatos();
    } catch (error) {
      toast.error("Error al cambiar el estado");
    } finally {
      setAvanzandoEstado(false);
    }
  };

  const manejarEliminarPedido = async () => {
    try {
      await eliminarPedido(id);
      toast.success("Pedido eliminado");
      router.push("/pedidos");
    } catch (error) {
      toast.error("Error al eliminar el pedido");
    }
  };

  if (cargando) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-4 lg:p-6 text-center py-20">
        <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Pedido no encontrado</p>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/pedidos">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  const esBorrador = pedido.estado === "borrador";
  const siguienteEstado = TRANSICIONES_PERMITIDAS[pedido.estado];

  // Cálculos financieros
  const costoTotal = productos.reduce(
    (s, p) => s + p.precioUnitario * p.cantidad,
    0
  );
  const gananciaTotal = productos.reduce(
    (s, p) => s + p.margen * p.cantidad,
    0
  );
  const totalCobrar = productos.reduce(
    (s, p) =>
      s +
      (p.precioUnitario + p.margen) * p.cantidad +
      (p.envioCliente || 0),
    0
  );
  const totalPagado = productos.reduce(
    (s, p) => s + (p.montoPagado || 0),
    0
  );
  const totalPendiente = totalCobrar - totalPagado;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pedidos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {pedido.tiendaNombre}
              </h1>
              <Badge
                variant="secondary"
                className={COLORES_ESTADO[pedido.estado]}
              >
                {ETIQUETAS_ESTADO[pedido.estado]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Creado el{" "}
              {pedido.fechaCreacion?.toDate?.()
                ? new Intl.DateTimeFormat("es", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(pedido.fechaCreacion.toDate())
                : "—"}
            </p>
          </div>
        </div>

        {esBorrador && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={manejarEliminarPedido}
              >
                <Trash2 className="size-4 mr-2" />
                Eliminar pedido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="py-2">
          <TimelinePedido estadoActual={pedido.estado} />
        </CardContent>
      </Card>

      {/* Botón Avanzar Estado */}
      {siguienteEstado && (
        <Button
          onClick={manejarAvanzarEstado}
          disabled={avanzandoEstado}
          className="w-full h-11"
          id="btn-avanzar-estado"
        >
          {avanzandoEstado ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <ArrowRight className="size-4 mr-1.5" />
          )}
          Avanzar a: {ETIQUETAS_ESTADO[siguienteEstado]}
        </Button>
      )}

      {/* Resumen Financiero */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Costo total
            </p>
            <p className="text-lg font-bold">${costoTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Ganancia
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${gananciaTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Cobrado
            </p>
            <p className="text-lg font-bold">${totalPagado.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pendiente
            </p>
            <p
              className={cn(
                "text-lg font-bold",
                totalPendiente > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              ${totalPendiente.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Productos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Productos</CardTitle>
            <CardDescription>
              {productos.length} producto{productos.length !== 1 ? "s" : ""} en
              el pedido
            </CardDescription>
          </div>
          {esBorrador && (
            <Dialog
              open={dialogoProducto}
              onOpenChange={setDialogoProducto}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => abrirDialogoProducto()}
                  id="btn-agregar-producto"
                >
                  <Plus className="size-4 mr-1.5" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {productoEditar ? "Editar producto" : "Agregar producto"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa los datos del producto
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit(onSubmitProducto)}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre-prod">Producto</Label>
                    <Input
                      id="nombre-prod"
                      placeholder="Nombre del producto"
                      {...register("nombre")}
                    />
                    {errors.nombre && (
                      <p className="text-xs text-destructive">
                        {errors.nombre.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cantidad-prod">Cantidad</Label>
                      <Input
                        id="cantidad-prod"
                        type="number"
                        min={1}
                        {...register("cantidad")}
                      />
                      {errors.cantidad && (
                        <p className="text-xs text-destructive">
                          {errors.cantidad.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="precio-prod">Precio unitario ($)</Label>
                      <Input
                        id="precio-prod"
                        type="number"
                        step="0.01"
                        min={0}
                        {...register("precioUnitario")}
                      />
                      {errors.precioUnitario && (
                        <p className="text-xs text-destructive">
                          {errors.precioUnitario.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="margen-prod">Margen ($)</Label>
                      <Input
                        id="margen-prod"
                        type="number"
                        step="0.01"
                        min={0}
                        {...register("margen")}
                      />
                      {errors.margen && (
                        <p className="text-xs text-destructive">
                          {errors.margen.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="envio-prod">Envío cliente ($)</Label>
                      <Input
                        id="envio-prod"
                        type="number"
                        step="0.01"
                        min={0}
                        {...register("envioCliente")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cliente-prod">Cliente</Label>
                    <div className="space-y-2">
                      <Input
                        id="cliente-prod"
                        placeholder="Nombre del cliente"
                        {...register("clienteNombre")}
                        list="clientes-lista"
                      />
                      <datalist id="clientes-lista">
                        {clientes.map((c) => (
                          <option key={c.id} value={c.nombre} />
                        ))}
                      </datalist>
                    </div>
                    {errors.clienteNombre && (
                      <p className="text-xs text-destructive">
                        {errors.clienteNombre.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogoProducto(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} id="btn-guardar-producto">
                      {isSubmitting && (
                        <Loader2 className="size-4 animate-spin mr-1.5" />
                      )}
                      {productoEditar ? "Guardar" : "Agregar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {productos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="size-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {esBorrador
                  ? "Agrega productos al pedido"
                  : "Sin productos"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {productos.map((prod) => {
                const total =
                  (prod.precioUnitario + prod.margen) * prod.cantidad +
                  (prod.envioCliente || 0);
                const clienteRegistrado = clientes.find(
                  (c) => c.nombre === prod.clienteNombre
                );

                return (
                  <div
                    key={prod.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prod.cantidad}x · ${prod.precioUnitario} + $
                          {prod.margen} margen
                          {prod.envioCliente
                            ? ` + $${prod.envioCliente} envío`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          ${total.toFixed(2)}
                        </span>
                        {esBorrador && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => abrirDialogoProducto(prod)}
                              >
                                <Pencil className="size-3.5 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  manejarEliminarProducto(prod.id)
                                }
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {prod.clienteNombre}
                        </span>
                        {clienteRegistrado && (
                          <a
                            href={`https://wa.me/${clienteRegistrado.whatsapp.replace(/[^\d+]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Gestión de Pagos */}
                      <Select
                        value={prod.estadoPago}
                        onValueChange={(val) =>
                          manejarCambioPago(
                            prod.id,
                            val as EstadoPago,
                            total
                          )
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-auto text-xs border-0",
                            COLORES_PAGO[prod.estadoPago]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin_pagar">Sin Pagar</SelectItem>
                          <SelectItem value="parcial">Parcial (50%)</SelectItem>
                          <SelectItem value="pagado">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
