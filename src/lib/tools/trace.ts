import type { TrazaEntry, DecisionHistorial } from "@/lib/schemas";
import { crearId } from "@/lib/tools";

export function registrarTraza(params: {
  herramienta: string;
  entrada: unknown;
  salida: unknown;
  estado?: TrazaEntry["estado"];
  mensaje?: string;
}): TrazaEntry {
  return {
    id: crearId("traza"),
    timestamp: new Date().toISOString(),
    herramienta: params.herramienta,
    entrada: params.entrada,
    salida: params.salida,
    estado: params.estado ?? "ok",
    mensaje: params.mensaje,
  };
}

export function registrarDecision(params: {
  tipo: DecisionHistorial["tipo"];
  detalle: string;
  snapshot?: unknown;
}): DecisionHistorial {
  return {
    id: crearId("dec"),
    timestamp: new Date().toISOString(),
    tipo: params.tipo,
    detalle: params.detalle,
    snapshot: params.snapshot,
  };
}
