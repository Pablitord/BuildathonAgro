import { NextResponse } from "next/server";
import { ApproveRequestSchema } from "@/lib/schemas";
import { aprobarOperacion } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ApproveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Solicitud inválida", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const operacion = aprobarOperacion(
      parsed.data.operacion_id,
      parsed.data.aprobar,
    );
    return NextResponse.json({ operacion });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la aprobación.",
      },
      { status: 500 },
    );
  }
}
