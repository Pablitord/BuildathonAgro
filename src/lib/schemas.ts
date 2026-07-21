import { z } from "zod";

export const CategoriaSchema = z.enum([
  "fruta",
  "hortaliza",
  "tuberculo",
  "cereal",
  "leguminosa",
  "cacao_cafe",
  "pesca_artesanal",
  "producto_procesado",
  "otro",
]);

export const MadurezSchema = z.enum([
  "verde",
  "pinton",
  "maduro",
  "muy_maduro",
  "seco",
  "no_aplica",
  "desconocido",
]);

export const CalidadSchema = z.enum([
  "primera",
  "segunda",
  "mixta",
  "procesamiento",
  "desconocida",
]);

export const HarvestSchema = z.object({
  productor: z.string().nullable(),
  producto_original: z.string().min(1),
  producto_canonico: z.string().min(1),
  categoria: CategoriaSchema,
  cantidad: z.number().positive(),
  unidad_original: z.string().min(1),
  cantidad_kg: z.number().positive().nullable(),
  ubicacion: z.string().nullable(),
  madurez: MadurezSchema,
  calidad: CalidadSchema,
  horas_limite: z.number().positive().nullable(),
  tiene_transporte: z.boolean().nullable(),
  precio_minimo_kg: z.number().nonnegative().nullable(),
  almacenamiento: z.string().nullable(),
  perecibilidad_orientativa: z
    .enum(["baja", "media", "alta", "muy_alta", "desconocida"])
    .optional()
    .default("desconocida"),
  datos_faltantes: z.array(z.string()),
  requiere_aclaracion: z.boolean(),
  preguntas: z.array(z.string()).optional().default([]),
  equivalencia_estimada: z.boolean().optional().default(false),
  nota_equivalencia: z.string().nullable().optional().default(null),
});

export const UrgenciaSchema = z.object({
  nivel: z.enum([
    "normal",
    "prioritaria",
    "critica",
    "informacion_insuficiente",
  ]),
  score: z.number().min(0).max(100),
  horas_estimadas: z.number().nullable(),
  factores: z.array(z.string()),
  justificacion: z.string(),
});

export const CompradorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: z.string(),
  productos_aceptados: z.array(z.string()),
  categorias_aceptadas: z.array(CategoriaSchema),
  calidades_aceptadas: z.array(CalidadSchema),
  capacidad_kg: z.number().positive(),
  precio_por_producto: z.record(z.string(), z.number()),
  precio_referencia_categoria: z.number(),
  recoge_en_finca: z.boolean(),
  ubicacion: z.string(),
  distancia_km: z.number().nonnegative(),
  horas_confirmacion: z.number().positive(),
  es_simulado: z.literal(true),
  disponible: z.boolean(),
  etiqueta: z.string().default("SIMULADO — requiere validación real"),
});

export const AsignacionSchema = z.object({
  comprador_id: z.string(),
  comprador_nombre: z.string(),
  kg_asignados: z.number().nonnegative(),
  precio_kg: z.number(),
  match_tipo: z.enum(["producto", "categoria"]),
  ingreso_bruto: z.number(),
  costo_transporte: z.number(),
  costo_empaque: z.number(),
  costo_manejo: z.number(),
  comision: z.number(),
  ingreso_neto: z.number(),
  es_principal: z.boolean(),
  etiqueta: z.string(),
  advertencia_precio: z.string().nullable().optional(),
});

export const DistribucionSchema = z.object({
  volumen_total_kg: z.number(),
  volumen_asignado_kg: z.number(),
  volumen_sin_asignar_kg: z.number(),
  asignaciones: z.array(AsignacionSchema),
  ingreso_neto_total: z.number(),
  ingreso_bruto_total: z.number(),
  costos_totales: z.number(),
});

export const TrazaEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  herramienta: z.string(),
  entrada: z.unknown(),
  salida: z.unknown(),
  estado: z.enum(["ok", "error", "omitido"]),
  mensaje: z.string().optional(),
  call_id: z.string().optional(),
});

export const DecisionHistorialSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  tipo: z.enum([
    "interpretacion",
    "plan_inicial",
    "cancelacion_comprador",
    "replanificacion",
    "aprobacion",
    "rechazo",
    "requiere_informacion",
    "sin_coincidencias",
  ]),
  detalle: z.string(),
  snapshot: z.unknown().optional(),
});

export const EstadoOperacionSchema = z.enum([
  "interpretando",
  "requiere_informacion",
  "buscando_compradores",
  "plan_generado",
  "sin_coincidencias",
  "pendiente_aprobacion",
  "aprobada",
  "rechazada",
  "error_controlado",
]);

export const OpenAIMetaSchema = z.object({
  activo: z.boolean(),
  response_id: z.string().nullable(),
  model: z.string().nullable(),
  motivo_fallback: z.string().nullable(),
  herramientas_ejecutadas: z.array(z.string()),
});

export const OperacionSchema = z.object({
  id: z.string(),
  lote: HarvestSchema,
  urgencia: UrgenciaSchema.nullable(),
  distribucion: DistribucionSchema.nullable(),
  compradores_encontrados: z.number().default(0),
  compradores_excluidos: z.array(z.string()),
  traza: z.array(TrazaEntrySchema),
  historial: z.array(DecisionHistorialSchema),
  estado: EstadoOperacionSchema,
  aprobado_en: z.string().nullable(),
  texto_original: z.string(),
  modo: z.enum(["openai", "fallback"]),
  openai: OpenAIMetaSchema,
  explicacion: z.string().nullable(),
  acciones_alternativas: z.array(z.string()).default([]),
});

export type Categoria = z.infer<typeof CategoriaSchema>;
export type Madurez = z.infer<typeof MadurezSchema>;
export type Calidad = z.infer<typeof CalidadSchema>;
export type Harvest = z.infer<typeof HarvestSchema>;
export type Urgencia = z.infer<typeof UrgenciaSchema>;
export type Comprador = z.infer<typeof CompradorSchema>;
export type Asignacion = z.infer<typeof AsignacionSchema>;
export type Distribucion = z.infer<typeof DistribucionSchema>;
export type TrazaEntry = z.infer<typeof TrazaEntrySchema>;
export type DecisionHistorial = z.infer<typeof DecisionHistorialSchema>;
export type EstadoOperacion = z.infer<typeof EstadoOperacionSchema>;
export type OpenAIMeta = z.infer<typeof OpenAIMetaSchema>;
export type Operacion = z.infer<typeof OperacionSchema>;

/** Schema estricto para Structured Outputs de interpretación (sin inventar kg de unidades variables). */
export const HarvestInterpretationSchema = HarvestSchema;

export const PlanRequestSchema = z.object({
  texto: z.string().min(5),
  equivalencia_kg_por_unidad: z.number().positive().optional(),
});

export const ReplanRequestSchema = z.object({
  operacion_id: z.string(),
  comprador_id: z.string(),
});

export const ApproveRequestSchema = z.object({
  operacion_id: z.string(),
  aprobar: z.boolean(),
});
