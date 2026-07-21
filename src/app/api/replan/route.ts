import { NextResponse } from "next/server";
import { ReplanRequestSchema } from "@/lib/schemas";
import { cancelarCompradorYReplanificar } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ReplanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Solicitud inválida", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const operacion = cancelarCompradorYReplanificar(
      parsed.data.operacion_id,
      parsed.data.comprador_id,
    );
    return NextResponse.json({ operacion });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo replanificar la operación.",
      },
      { status: 500 },
    );
  }
}
