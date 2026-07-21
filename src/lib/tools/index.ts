import buyersData from "@/data/buyers.json";
import costsData from "@/data/costs.json";
import type { Asignacion, Categoria, Comprador, Distribucion, Harvest, Madurez, Urgencia } from "@/lib/schemas";

const costos = costsData.costos;
const aliases: Record<string, { producto: string; categoria: Categoria }> = {
  tomate: { producto: "tomate", categoria: "hortaliza" }, platano: { producto: "platano", categoria: "fruta" }, barraganete: { producto: "platano", categoria: "fruta" },
  yuca: { producto: "yuca", categoria: "tuberculo" }, mandioca: { producto: "yuca", categoria: "tuberculo" }, cacao: { producto: "cacao", categoria: "cacao_cafe" },
  maiz: { producto: "maiz", categoria: "cereal" }, limon: { producto: "limon", categoria: "fruta" }, papaya: { producto: "papaya", categoria: "fruta" },
  pescado: { producto: "pescado", categoria: "pesca_artesanal" }, papa: { producto: "papa", categoria: "tuberculo" }, cafe: { producto: "cafe", categoria: "cacao_cafe" },
  pitahaya: { producto: "pitahaya", categoria: "fruta" }, mango: { producto: "mango", categoria: "fruta" }, arroz: { producto: "arroz", categoria: "cereal" },
};

export function normalizarTexto(texto: string): string { return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim(); }
export function normalizarProducto(producto: string): { producto: string; categoria: Categoria } {
  const normalized = normalizarTexto(producto).replace(/\b(nacional|fino de aroma|amarillo|rinon)\b/g, "").trim();
  const singular = normalized.endsWith("es") ? normalized.slice(0, -2) : normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
  const known = aliases[normalized] ?? aliases[singular] ?? Object.entries(aliases).find(([alias]) => normalized.includes(alias))?.[1];
  return known ?? { producto: normalized || "producto desconocido", categoria: "otro" };
}

function detectarProducto(texto: string): { original: string; producto: string; categoria: Categoria } {
  const normalized = normalizarTexto(texto);
  const match = Object.keys(aliases).sort((a, b) => b.length - a.length).find((alias) => new RegExp(`\\b${alias}s?\\b`).test(normalized));
  const original = match ?? normalized.match(/(?:de|kg de|toneladas de|quintales de)\s+([a-záéíóúñ ]+?)(?:\s+(?:en|y|para)|[.,]|$)/i)?.[1] ?? "producto desconocido";
  const normalizedProduct = normalizarProducto(original);
  return { original: original.trim(), ...normalizedProduct };
}

export function convertirAKg(cantidad: number, unidad: string): number | null {
  const unit = normalizarTexto(unidad);
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(unit)) return cantidad;
  if (["g", "gramo", "gramos"].includes(unit)) return cantidad / 1000;
  if (["lb", "libra", "libras"].includes(unit)) return cantidad * 0.453592;
  if (["t", "tonelada", "toneladas"].includes(unit)) return cantidad * 1000;
  if (["quintal", "quintales"].includes(unit)) return cantidad * 45.3592;
  return null;
}

export function extraerLoteLocal(texto: string, equivalenciaKgPorUnidad?: number): Harvest {
  const value = normalizarTexto(texto).match(/(\d+(?:[.,]\d+)?)\s*(gavetas?|cajas?|sacos?|racimos?|canastas?|quintales?|toneladas?|kilos?|kilogramos?|gramos?|libras?|kg|lb|g|t)/);
  const cantidad = value ? Number(value[1].replace(",", ".")) : 0;
  const unidad = value?.[2] ?? "desconocida";
  const product = detectarProducto(texto);
  const madurez: Madurez = /muy madur|sobremadur/.test(normalizarTexto(texto)) ? "muy_maduro" : /madur/.test(normalizarTexto(texto)) ? "maduro" : /seco/.test(normalizarTexto(texto)) ? "seco" : /verde/.test(normalizarTexto(texto)) ? "verde" : "desconocido";
  const variableUnit = convertirAKg(1, unidad) === null;
  const cantidad_kg = cantidad > 0 ? (variableUnit ? (equivalenciaKgPorUnidad ? cantidad * equivalenciaKgPorUnidad : null) : convertirAKg(cantidad, unidad)) : null;
  const missing = [cantidad <= 0 && "cantidad y unidad", !cantidad_kg && "peso aproximado por unidad"].filter(Boolean) as string[];
  const location = texto.match(/\ben\s+([A-Za-zÁÉÍÓÚÑáéíóúñ ]+?)(?:[.,]|$)/)?.[1]?.trim() ?? null;
  return { productor: texto.match(/(?:soy|me llamo)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ ]+?)(?:\s+(?:y|de|en)|[.,]|$)/i)?.[1]?.trim() ?? null, producto_original: product.original, producto_canonico: product.producto, categoria: product.categoria, cantidad: cantidad || 1, unidad_original: unidad, cantidad_kg, ubicacion: location, madurez, calidad: "desconocida", horas_limite: null, tiene_transporte: null, precio_minimo_kg: null, almacenamiento: null, perecibilidad_orientativa: "desconocida", datos_faltantes: missing, requiere_aclaracion: missing.length > 0, preguntas: !cantidad_kg ? ["¿Cuánto pesa aproximadamente cada unidad y en qué ciudad se encuentra la cosecha?"] : [], equivalencia_estimada: false, nota_equivalencia: null };
}

export function calcularUrgencia(lote: Harvest): Urgencia {
  if (!lote.cantidad_kg) return { nivel: "informacion_insuficiente", score: 0, horas_estimadas: null, factores: ["Falta cantidad en kg"], justificacion: "Se requiere el peso para evaluar urgencia y destinos." };
  const base = lote.horas_limite ?? costsData.perecibilidad_categoria[lote.categoria];
  const factor = lote.madurez === "muy_maduro" ? 0.25 : lote.madurez === "maduro" ? 0.55 : lote.madurez === "seco" ? 1.8 : 1;
  const hours = Math.max(1, Math.round(base * factor));
  const level = hours <= 18 ? "critica" : hours <= 72 ? "prioritaria" : "normal";
  return { nivel: level, score: level === "critica" ? 95 : level === "prioritaria" ? 70 : 30, horas_estimadas: hours, factores: [`Categoría ${lote.categoria}`, `Madurez ${lote.madurez}`, lote.horas_limite ? "Límite declarado" : "Perecibilidad orientativa"], justificacion: `Ventana estimada de ${hours} horas según categoría y estado declarado.` };
}

export function getBuyers(): Comprador[] { return buyersData.compradores as unknown as Comprador[]; }
export function buscarCompradores(lote: Pick<Harvest, "producto_canonico" | "categoria" | "calidad" | "precio_minimo_kg">, excluidos: string[] = []): Array<Comprador & { match_tipo: "producto" | "categoria"; precio_kg: number }> {
  return getBuyers().flatMap((buyer) => {
    const exact = buyer.productos_aceptados.includes(lote.producto_canonico);
    const category = buyer.categorias_aceptadas.includes(lote.categoria);
    const quality = lote.calidad === "desconocida" || buyer.calidades_aceptadas.includes(lote.calidad);
    const price = buyer.precio_por_producto[lote.producto_canonico] ?? buyer.precio_referencia_categoria;
    if (!buyer.disponible || excluidos.includes(buyer.id) || (!exact && !category) || !quality || (lote.precio_minimo_kg != null && price < lote.precio_minimo_kg)) return [];
    return [{ ...buyer, match_tipo: (exact ? "producto" : "categoria") as "producto" | "categoria", precio_kg: price }];
  }).sort((a, b) => (b.precio_kg / (b.distancia_km + 1)) - (a.precio_kg / (a.distancia_km + 1)));
}

export function calcularIngresoNetoAsignacion(params: { kg: number; precio_kg: number; distancia_km: number }) { const ingreso_bruto = Math.round(params.kg * params.precio_kg); const costo_transporte = Math.round(params.kg * params.distancia_km * costos.transporte_por_km_por_kg); const costo_empaque = Math.round(params.kg * costos.empaque_por_kg); const costo_manejo = Math.round(params.kg * costos.manejo_por_kg); const comision = Math.round(ingreso_bruto * costos.comision_porcentaje); return { kg_asignados: params.kg, precio_kg: params.precio_kg, ingreso_bruto, costo_transporte, costo_empaque, costo_manejo, comision, ingreso_neto: ingreso_bruto - costo_transporte - costo_empaque - costo_manejo - comision }; }
export function optimizarDistribucion(lote: Harvest, buyers: ReturnType<typeof buscarCompradores>): Distribucion { const total = lote.cantidad_kg ?? 0; let remaining = total; const asignaciones: Asignacion[] = []; for (const buyer of buyers) { if (remaining <= 0) break; const kg = Math.min(remaining, buyer.capacidad_kg); const calc = calcularIngresoNetoAsignacion({ kg, precio_kg: buyer.precio_kg, distancia_km: buyer.distancia_km }); asignaciones.push({ comprador_id: buyer.id, comprador_nombre: buyer.nombre, ...calc, match_tipo: buyer.match_tipo, es_principal: asignaciones.length === 0, etiqueta: buyer.etiqueta, advertencia_precio: null }); remaining -= kg; } const ingreso_bruto_total = asignaciones.reduce((sum, a) => sum + a.ingreso_bruto, 0); const ingreso_neto_total = asignaciones.reduce((sum, a) => sum + a.ingreso_neto, 0); return { volumen_total_kg: total, volumen_asignado_kg: total - remaining, volumen_sin_asignar_kg: remaining, asignaciones, ingreso_bruto_total, ingreso_neto_total, costos_totales: ingreso_bruto_total - ingreso_neto_total }; }
export function replanificarOperacion(lote: Harvest, cancelado: string, excluidos: string[] = []) { const next = Array.from(new Set([...excluidos, cancelado])); const buyers = buscarCompradores(lote, next); return { distribucion: optimizarDistribucion(lote, buyers), excluidos: next }; }
export function validarAsignacionesNoSuperanVolumen(total: number, asignaciones: { kg_asignados: number }[]) { return asignaciones.reduce((sum, a) => sum + a.kg_asignados, 0) <= total; }
export function crearId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
