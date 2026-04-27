import { z } from "zod";

// ─── Cliente ───

export const esquemaCliente = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  whatsapp: z
    .string()
    .min(1, "El WhatsApp es obligatorio")
    .regex(/^[\d+\-\s()]+$/, "Número de WhatsApp inválido"),
  notas: z.string().max(500).optional().or(z.literal("")),
});

export type DatosCliente = z.infer<typeof esquemaCliente>;

// ─── Tienda ───

export const esquemaTienda = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  notas: z.string().max(500).optional().or(z.literal("")),
});

export type DatosTienda = z.infer<typeof esquemaTienda>;

// ─── Producto del Pedido ───

const numPositivo = z.preprocess(
  (val) => (val === "" || val === undefined ? 0 : Number(val)),
  z.number().min(0)
);

const numMinUno = z.preprocess(
  (val) => (val === "" || val === undefined ? 1 : Number(val)),
  z.number().min(1, "Mínimo 1 unidad")
);

export const esquemaProducto = z.object({
  nombre: z.string().min(1, "El nombre del producto es obligatorio").max(200),
  cantidad: numMinUno,
  precioUnitario: numPositivo,
  margen: numPositivo,
  envioCliente: numPositivo.optional(),
  clienteNombre: z.string().min(1, "El nombre del cliente es obligatorio"),
  clienteRef: z.string().optional().or(z.literal("")),
});

export type DatosProducto = z.infer<typeof esquemaProducto>;

// ─── Login ───

export const esquemaLogin = z.object({
  email: z.string().email("Correo electrónico inválido"),
  contrasena: z.string().min(6, "Mínimo 6 caracteres"),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
