import { NextResponse } from "next/server";
import { PlanRequestSchema } from "@/lib/schemas";
import { crearPlan } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Texto inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const operacion = await crearPlan(
      parsed.data.datos_complementarios
        ? `${parsed.data.texto}\n${parsed.data.datos_complementarios}`
        : parsed.data.texto,
      parsed.data.equivalencia_kg_por_unidad,
    );
    return NextResponse.json({ operacion });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el plan. Intenta de nuevo.",
      },
      { status: 500 },
    );
  }
}
