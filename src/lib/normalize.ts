import type { Categoria } from "@/lib/schemas";

/** Quita tildes, minúsculas y espacios duplicados. */
export function normalizarTexto(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES: Record<string, string> = {
  tomate: "tomate",
  tomates: "tomate",
  "tomate rinon": "tomate",
  "tomate riñon": "tomate",
  platano: "platano",
  platanos: "platano",
  barraganete: "platano",
  dominico: "platano",
  banana: "platano",
  banano: "platano",
  yuca: "yuca",
  yucas: "yuca",
  mandioca: "yuca",
  cassava: "yuca",
  cacao: "cacao",
  "cacao nacional": "cacao",
  "cacao fino de aroma": "cacao",
  "cacao seco": "cacao",
  maiz: "maiz",
  "maiz amarillo": "maiz",
  "maiz seco": "maiz",
  limon: "limon",
  limones: "limon",
  "limon sutil": "limon",
  papaya: "papaya",
  papayas: "papaya",
  pescado: "pescado",
  "pescado artesanal": "pescado",
  mariscos: "pescado",
  cafe: "cafe",
  "cafe arabica": "cafe",
  arroz: "arroz",
  frejol: "frejol",
  frijol: "frejol",
  papa: "papa",
  papas: "papa",
  cebolla: "cebolla",
  pina: "pina",
  mango: "mango",
  naranja: "naranja",
  pitahaya: "pitahaya",
  "pitahaya amarilla": "pitahaya amarilla",
  dragonfruit: "pitahaya",
};

const CATEGORIA_POR_PRODUCTO: Record<string, Categoria> = {
  tomate: "hortaliza",
  platano: "fruta",
  yuca: "tuberculo",
  cacao: "cacao_cafe",
  cafe: "cacao_cafe",
  maiz: "cereal",
  arroz: "cereal",
  limon: "fruta",
  papaya: "fruta",
  pina: "fruta",
  mango: "fruta",
  naranja: "fruta",
  pitahaya: "fruta",
  "pitahaya amarilla": "fruta",
  pescado: "pesca_artesanal",
  frejol: "leguminosa",
  papa: "tuberculo",
  cebolla: "hortaliza",
};

export function normalizarProducto(productoOriginal: string): {
  producto_canonico: string;
  categoria_sugerida: Categoria | null;
} {
  const norm = normalizarTexto(productoOriginal);
  if (!norm) {
    return { producto_canonico: "desconocido", categoria_sugerida: null };
  }

  if (ALIASES[norm]) {
    const canon = ALIASES[norm];
    return {
      producto_canonico: canon,
      categoria_sugerida: CATEGORIA_POR_PRODUCTO[canon] ?? null,
    };
  }

  // Coincidencia parcial por alias más largo primero
  const sorted = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (norm.includes(alias) || alias.includes(norm)) {
      const canon = ALIASES[alias];
      return {
        producto_canonico: canon,
        categoria_sugerida: CATEGORIA_POR_PRODUCTO[canon] ?? null,
      };
    }
  }

  // Singularización simple
  const singular = norm.endsWith("es")
    ? norm.slice(0, -2)
    : norm.endsWith("s")
      ? norm.slice(0, -1)
      : norm;
  if (ALIASES[singular]) {
    const canon = ALIASES[singular];
    return {
      producto_canonico: canon,
      categoria_sugerida: CATEGORIA_POR_PRODUCTO[canon] ?? null,
    };
  }

  return {
    producto_canonico: norm,
    categoria_sugerida: CATEGORIA_POR_PRODUCTO[norm] ?? null,
  };
}

export function sugerirCategoria(
  productoCanonico: string,
  fallback: Categoria = "otro",
): Categoria {
  return CATEGORIA_POR_PRODUCTO[productoCanonico] ?? fallback;
}

/** Unidades fijas convertibles sin pedir peso. */
export const UNIDADES_FIJAS: Record<string, number> = {
  kg: 1,
  kilogramo: 1,
  kilogramos: 1,
  g: 0.001,
  gramo: 0.001,
  gramos: 0.001,
  lb: 0.453592,
  libra: 0.453592,
  libras: 0.453592,
  t: 1000,
  ton: 1000,
  tonelada: 1000,
  toneladas: 1000,
  qq: 45.3592,
  quintal: 45.3592,
  quintales: 45.3592,
};

export const UNIDADES_VARIABLES = new Set([
  "gaveta",
  "gavetas",
  "caja",
  "cajas",
  "saco",
  "sacos",
  "racimo",
  "racimos",
  "canasta",
  "canastas",
  "bulto",
  "bultos",
]);

export function esUnidadVariable(unidad: string): boolean {
  const u = normalizarTexto(unidad);
  return UNIDADES_VARIABLES.has(u);
}

export function convertirAKg(
  cantidad: number,
  unidad: string,
  kgPorUnidad?: number | null,
): {
  cantidad_kg: number | null;
  requiere_peso_por_unidad: boolean;
  equivalencia_estimada: boolean;
  nota: string | null;
} {
  const u = normalizarTexto(unidad);

  if (UNIDADES_FIJAS[u] != null) {
    return {
      cantidad_kg: cantidad * UNIDADES_FIJAS[u],
      requiere_peso_por_unidad: false,
      equivalencia_estimada: false,
      nota: null,
    };
  }

  if (esUnidadVariable(u)) {
    if (kgPorUnidad != null && kgPorUnidad > 0) {
      return {
        cantidad_kg: cantidad * kgPorUnidad,
        requiere_peso_por_unidad: false,
        equivalencia_estimada: true,
        nota: `Equivalencia de demo/productor: ${kgPorUnidad} kg por ${u}`,
      };
    }
    return {
      cantidad_kg: null,
      requiere_peso_por_unidad: true,
      equivalencia_estimada: false,
      nota: `Se necesita el peso aproximado por ${u}`,
    };
  }

  // Unidad desconocida
  if (kgPorUnidad != null && kgPorUnidad > 0) {
    return {
      cantidad_kg: cantidad * kgPorUnidad,
      requiere_peso_por_unidad: false,
      equivalencia_estimada: true,
      nota: `Equivalencia declarada para unidad "${u}"`,
    };
  }

  return {
    cantidad_kg: null,
    requiere_peso_por_unidad: true,
    equivalencia_estimada: false,
    nota: `Unidad "${unidad}" no convertible sin peso por unidad`,
  };
}
