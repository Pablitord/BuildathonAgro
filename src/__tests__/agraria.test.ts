import { describe, expect, it } from "vitest";
import { aprobarOperacion, cancelarCompradorYReplanificar, crearPlan } from "@/lib/agent";
import { extraerLoteLocal, normalizarProducto } from "@/lib/tools";

describe("AgrarIA genérica", () => {
  it("normaliza producto y convierte unidades seguras", () => { expect(normalizarProducto("plátanos").producto).toBe("platano"); expect(extraerLoteLocal("Tengo 2 toneladas de maíz seco en Chone").cantidad_kg).toBe(2000); expect(extraerLoteLocal("Tengo 40 quintales de yuca").cantidad_kg).toBeCloseTo(1814.368); });
  it("solicita peso para unidades variables", () => { const lote=extraerLoteLocal("Tengo 80 gavetas de limón en Portoviejo"); expect(lote.cantidad_kg).toBeNull(); expect(lote.requiere_aclaracion).toBe(true); });
  it("crea un plan local, conserva cancelación y requiere aprobación", async () => { const op=await crearPlan("Tengo 700 kg de cacao seco en Calceta"); expect(op.estado).toBe("pendiente_aprobacion"); expect(op.distribucion).not.toBeNull(); const buyer=op.distribucion!.asignaciones[0].comprador_id; const replan=cancelarCompradorYReplanificar(op.id,buyer); expect(replan.compradores_excluidos).toContain(buyer); expect(replan.historial.some(h=>h.tipo==="cancelacion_comprador"&&h.snapshot)).toBe(true); expect(aprobarOperacion(replan.id,true).estado).toBe("aprobada"); });
  it("conserva productos desconocidos sin romper", () => { const lote=extraerLoteLocal("Tengo 450 kg de pitahaya amarilla"); expect(lote.producto_canonico).toContain("pitahaya"); });
});
