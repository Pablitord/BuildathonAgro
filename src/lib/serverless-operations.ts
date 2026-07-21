import type { Operacion } from "@/lib/schemas";
import { replanificarOperacion } from "@/lib/tools";
import { registrarDecision, registrarTraza } from "@/lib/tools/trace";

/** Operaciones puras: no leen ni escriben memoria de proceso. */
export function replanificarOperacionActual(op: Operacion, compradorId: string): Operacion {
  if (op.estado === "aprobada") throw new Error("No se puede replanificar una operación ya aprobada");
  if (!op.distribucion) throw new Error("No hay plan para replanificar");
  const result = replanificarOperacion(op.lote, compradorId, op.compradores_excluidos);
  return { ...op, distribucion: result.distribucion, compradores_excluidos: result.excluidos, compradores_encontrados: result.distribucion.asignaciones.length, estado: "pendiente_aprobacion", historial: [...op.historial, registrarDecision({ tipo: "cancelacion_comprador", detalle: `Comprador ${compradorId} cancelado.`, snapshot: { anterior: op.distribucion } }), registrarDecision({ tipo: "replanificacion", detalle: "Plan recalculado.", snapshot: { nueva: result.distribucion } })], traza: [...op.traza, registrarTraza({ herramienta: "replanificar_operacion", entrada: { compradorId }, salida: result })], openai: { ...op.openai, herramientas_ejecutadas: [...op.openai.herramientas_ejecutadas, "replanificar_operacion"] } };
}

export function aprobarOperacionActual(op: Operacion, aprobar: boolean): Operacion {
  if (op.estado === "aprobada") throw new Error("La operación ya fue aprobada");
  if (op.estado !== "pendiente_aprobacion") throw new Error("La operación no tiene un plan listo para aprobación");
  return { ...op, estado: aprobar ? "aprobada" : "rechazada", aprobado_en: aprobar ? new Date().toISOString() : null, historial: [...op.historial, registrarDecision({ tipo: aprobar ? "aprobacion" : "rechazo", detalle: aprobar ? "Operación confirmada por humano." : "Operación rechazada por humano." })], traza: [...op.traza, registrarTraza({ herramienta: "aprobacion_humana", entrada: { aprobar }, salida: { estado: aprobar ? "aprobada" : "rechazada" } })] };
}
