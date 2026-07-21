import { describe, expect, it } from "vitest";
import { crearPlan } from "@/lib/agent";
import { aprobarOperacionActual, replanificarOperacionActual } from "@/lib/serverless-operations";
import { extraerLoteLocal, normalizarProducto } from "@/lib/tools";
import { formatCurrency } from "@/lib/utils";
import examples from "@/data/examples.json";

describe("AgrarIA genérica", () => {
  it("normaliza producto y convierte unidades seguras", () => { expect(normalizarProducto("plátanos").producto).toBe("platano"); expect(extraerLoteLocal("Tengo 2 toneladas de maíz seco en Chone").cantidad_kg).toBe(2000); expect(extraerLoteLocal("Tengo 40 quintales de yuca").cantidad_kg).toBeCloseTo(1814.368); });
  it("solicita peso para unidades variables", () => { const lote=extraerLoteLocal("Tengo 80 gavetas de limón en Portoviejo"); expect(lote.cantidad_kg).toBeNull(); expect(lote.requiere_aclaracion).toBe(true); });
  it("replanifica y aprueba sin store en memoria", async () => { const op=await crearPlan("Tengo 700 kg de cacao seco en Calceta"); expect(op.estado).toBe("pendiente_aprobacion"); const buyer=op.distribucion!.asignaciones[0].comprador_id; const replan=replanificarOperacionActual(op,buyer); expect(replan.compradores_excluidos).toContain(buyer); expect(replan.historial.some(h=>h.tipo==="cancelacion_comprador"&&h.snapshot)).toBe(true); expect(aprobarOperacionActual(replan,true).estado).toBe("aprobada"); });
  it("conserva productos desconocidos sin romper", () => { const lote=extraerLoteLocal("Tengo 450 kg de pitahaya amarilla"); expect(lote.producto_canonico).toContain("pitahaya"); });
  it("conserva datos explícitos de logística, precio, plazo y ubicación", () => { const lote=extraerLoteLocal("Soy Carlos, tengo 2 toneladas de maíz seco en Chone. Tengo transporte, quiero vender esta semana y mi precio mínimo es 30 centavos por kilo."); expect(lote.cantidad_kg).toBe(2000); expect(lote.ubicacion).toBe("Chone"); expect(lote.tiene_transporte).toBe(true); expect(lote.precio_minimo_kg).toBe(0.3); expect(lote.plazo_declarado).toBe("esta semana"); });
  it("no usa la urgencia inferida como una precisión de horas en su explicación", () => { const lote=extraerLoteLocal("Tengo 650 kg de cacao seco en Calceta"); expect(lote.horas_limite).toBeNull(); });
  it("muestra precios unitarios con dos decimales sin redondearlos a cero", () => { expect(formatCurrency(0.22)).toMatch(/0[,.]22/); });
  it("mantiene el caso de demostración de Rocafuerte", () => { const lote=extraerLoteLocal(examples.caso_demostracion.texto); expect(lote.cantidad_kg).toBe(900); expect(lote.producto_canonico).toBe("tomate"); expect(lote.ubicacion).toContain("Rocafuerte"); expect(lote.horas_limite).toBe(24); expect(lote.tiene_transporte).toBe(false); expect(lote.precio_minimo_kg).toBe(0.25); });
});
