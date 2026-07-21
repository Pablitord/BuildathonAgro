import { NextResponse } from "next/server";
import { ApproveRequestSchema } from "@/lib/schemas";
import { aprobarOperacionActual } from "@/lib/serverless-operations";

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

    const operacion = aprobarOperacionActual(parsed.data.operacion, parsed.data.aprobar);
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
