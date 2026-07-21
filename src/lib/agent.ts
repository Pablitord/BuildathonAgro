import { HarvestSchema, type Harvest, type Operacion, type TrazaEntry } from "@/lib/schemas";
import { buscarCompradores, calcularUrgencia, crearId, extraerLoteLocal, optimizarDistribucion, replanificarOperacion } from "@/lib/tools";
import { registrarDecision, registrarTraza } from "@/lib/tools/trace";
import { getOperacion, saveOperacion, updateOperacion } from "@/lib/store";

const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const categorias = ["fruta", "hortaliza", "tuberculo", "cereal", "leguminosa", "cacao_cafe", "pesca_artesanal", "producto_procesado", "otro"];
const madureces = ["verde", "pinton", "maduro", "muy_maduro", "seco", "no_aplica", "desconocido"];
const calidades = ["primera", "segunda", "mixta", "procesamiento", "desconocida"];
type Interpretation = Pick<Harvest, "producto_original" | "producto_canonico" | "categoria" | "madurez" | "calidad">;

async function interpretWithOpenAI(texto: string, base: Harvest) {
  const traza: TrazaEntry[] = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { lote: base, traza, activo: false, responseId: null, usedModel: null, motivo: "OPENAI_API_KEY no está disponible en el proceso del servidor.", herramientas: [] as string[] };
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey });
    const tools = [{ type: "function" as const, name: "interpretar_lote", description: "Clasifica el producto sin inventar cantidad, peso, precio ni ubicación.", strict: true, parameters: { type: "object", additionalProperties: false, required: ["producto_original", "producto_canonico", "categoria", "madurez", "calidad"], properties: { producto_original: { type: "string" }, producto_canonico: { type: "string" }, categoria: { type: "string", enum: categorias }, madurez: { type: "string", enum: madureces }, calidad: { type: "string", enum: calidades } } } }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any = await (client.responses.create as any)({ model, input: [{ role: "system", content: "Interpreta mensajes agroalimentarios. Conserva productos desconocidos normalizados y no inventes datos físicos o comerciales." }, { role: "user", content: texto }], tools, tool_choice: { type: "function", name: "interpretar_lote" } });
    let responseId: string | null = response.id ?? null;
    const seen = new Set<string>(); let interpretation: Interpretation | null = null;
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const calls = (response.output ?? []).filter((item: { type?: string }) => item.type === "function_call");
      if (!calls.length) break;
      const outputs: Array<{ type: string; call_id: string; output: string }> = [];
      for (const call of calls) {
        if (!call.call_id || seen.has(call.call_id)) continue;
        seen.add(call.call_id);
        const args = JSON.parse(call.arguments ?? "{}") as Interpretation;
        const parsed = HarvestSchema.pick({ producto_original: true, producto_canonico: true, categoria: true, madurez: true, calidad: true }).parse(args);
        interpretation = parsed;
        traza.push(registrarTraza({ herramienta: "interpretar_lote", entrada: { texto }, salida: parsed, mensaje: "Function call validado de OpenAI." }));
        outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ aceptado: true }) });
      }
      if (!outputs.length) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await (client.responses.create as any)({ model, previous_response_id: response.id, input: outputs, tools });
      responseId = response.id ?? responseId;
    }
    if (!interpretation || !responseId) throw new Error("OpenAI no devolvió una interpretación validable.");
    return { lote: HarvestSchema.parse({ ...base, ...interpretation }), traza, activo: true, responseId, usedModel: model, motivo: null, herramientas: ["interpretar_lote"] };
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "Falló la llamada a OpenAI.";
    traza.push(registrarTraza({ herramienta: "interpretar_lote", entrada: { texto }, salida: null, estado: "error", mensaje: motivo }));
    return { lote: base, traza, activo: false, responseId: null, usedModel: null, motivo, herramientas: [] as string[] };
  }
}

export async function crearPlan(texto: string, equivalenciaKgPorUnidad?: number): Promise<Operacion> {
  const ai = await interpretWithOpenAI(texto, extraerLoteLocal(texto, equivalenciaKgPorUnidad));
  const traza = [...ai.traza]; const tools = [...ai.herramientas]; const historial = [registrarDecision({ tipo: "interpretacion", detalle: ai.activo ? "Lote interpretado por OpenAI y validado." : "Lote interpretado por respaldo local.", snapshot: { lote: ai.lote, openai: ai.activo } })];
  let urgencia = null; let distribucion = null; let estado: Operacion["estado"]; let encontrados = 0; let explicacion = ""; let acciones: string[] = [];
  if (ai.lote.requiere_aclaracion || !ai.lote.cantidad_kg) { estado = "requiere_informacion"; explicacion = ai.lote.preguntas[0] ?? "Faltan datos para generar un plan confiable."; historial.push(registrarDecision({ tipo: "requiere_informacion", detalle: explicacion })); }
  else {
    urgencia = calcularUrgencia(ai.lote); tools.push("calcular_urgencia"); traza.push(registrarTraza({ herramienta: "calcular_urgencia", entrada: ai.lote, salida: urgencia }));
    const buyers = buscarCompradores(ai.lote); encontrados = buyers.length; tools.push("buscar_compradores"); traza.push(registrarTraza({ herramienta: "buscar_compradores", entrada: { producto: ai.lote.producto_canonico, categoria: ai.lote.categoria }, salida: buyers.map((buyer) => buyer.id) }));
    if (!buyers.length) { estado = "sin_coincidencias"; explicacion = "No encontramos compradores compatibles en el catálogo actual. La cosecha fue registrada y está lista para recibir nuevas demandas."; acciones = ["Registrar una nueva demanda", "Consultar una asociación local"]; historial.push(registrarDecision({ tipo: "sin_coincidencias", detalle: explicacion })); }
    else { distribucion = optimizarDistribucion(ai.lote, buyers); tools.push("calcular_ingreso_neto", "optimizar_distribucion"); traza.push(registrarTraza({ herramienta: "optimizar_distribucion", entrada: { compradores: buyers.map((buyer) => buyer.id) }, salida: distribucion })); estado = "pendiente_aprobacion"; explicacion = "Plan generado con destinos simulados; requiere aprobación humana."; historial.push(registrarDecision({ tipo: "plan_inicial", detalle: explicacion, snapshot: { distribucion } })); }
  }
  const op: Operacion = { id: crearId("op"), lote: ai.lote, urgencia, distribucion, compradores_encontrados: encontrados, compradores_excluidos: [], traza, historial, estado, aprobado_en: null, texto_original: texto, modo: ai.activo ? "openai" : "fallback", openai: { activo: ai.activo, response_id: ai.responseId, model: ai.usedModel, motivo_fallback: ai.motivo, herramientas_ejecutadas: tools }, explicacion, acciones_alternativas: acciones };
  saveOperacion(op); return op;
}

export function cancelarCompradorYReplanificar(id: string, compradorId: string): Operacion { const op = getOperacion(id); if (!op) throw new Error("Operación no encontrada"); if (op.estado === "aprobada") throw new Error("No se puede replanificar una operación ya aprobada"); if (!op.distribucion) throw new Error("No hay plan para replanificar"); const result = replanificarOperacion(op.lote, compradorId, op.compradores_excluidos); const updated = updateOperacion(id, (current) => ({ ...current, distribucion: result.distribucion, compradores_excluidos: result.excluidos, compradores_encontrados: result.distribucion.asignaciones.length, estado: "pendiente_aprobacion", historial: [...current.historial, registrarDecision({ tipo: "cancelacion_comprador", detalle: `Comprador ${compradorId} cancelado.`, snapshot: { anterior: current.distribucion } }), registrarDecision({ tipo: "replanificacion", detalle: "Plan recalculado.", snapshot: { nueva: result.distribucion } })], traza: [...current.traza, registrarTraza({ herramienta: "replanificar_operacion", entrada: { compradorId }, salida: result })], openai: { ...current.openai, herramientas_ejecutadas: [...current.openai.herramientas_ejecutadas, "replanificar_operacion"] } })); if (!updated) throw new Error("No se pudo actualizar la operación"); return updated; }
export function aprobarOperacion(id: string, aprobar: boolean): Operacion { const op = getOperacion(id); if (!op) throw new Error("Operación no encontrada"); if (op.estado === "aprobada") throw new Error("La operación ya fue aprobada"); if (op.estado !== "pendiente_aprobacion") throw new Error("La operación no tiene un plan listo para aprobación"); const updated = updateOperacion(id, (current) => ({ ...current, estado: aprobar ? "aprobada" : "rechazada", aprobado_en: aprobar ? new Date().toISOString() : null, historial: [...current.historial, registrarDecision({ tipo: aprobar ? "aprobacion" : "rechazo", detalle: aprobar ? "Operación confirmada por humano." : "Operación rechazada por humano." })], traza: [...current.traza, registrarTraza({ herramienta: "aprobacion_humana", entrada: { aprobar }, salida: { estado: aprobar ? "aprobada" : "rechazada" } })] })); if (!updated) throw new Error("No se pudo actualizar la operación"); return updated; }
