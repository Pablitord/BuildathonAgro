"use client";

import type { TrazaEntry } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toolLabels: Record<string, string> = {
  extraer_lote: "Extraer lote",
  calcular_urgencia: "Calcular urgencia",
  buscar_compradores: "Buscar compradores",
  calcular_ingreso_neto: "Calcular ingreso neto",
  optimizar_distribucion: "Optimizar distribución",
  replanificar_operacion: "Replanificar operación",
  registrar_traza: "Registrar traza",
  pipeline_local: "Pipeline local",
  cancelacion: "Cancelación",
  aprobacion_humana: "Aprobación humana",
};

export function ToolTimeline({ traza }: { traza: TrazaEntry[] }) {
  return (
    <ol className="relative space-y-0 border-l border-[var(--border)] pl-6">
      {traza.map((entry, index) => (
        <li key={entry.id} className="relative pb-6 last:pb-0">
          <span
            className={cn(
              "absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--background)]",
              entry.estado === "ok" && "bg-[var(--success)]",
              entry.estado === "error" && "bg-[var(--danger)]",
              entry.estado === "omitido" && "bg-[var(--muted-foreground)]",
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">
              {index + 1}. {toolLabels[entry.herramienta] ?? entry.herramienta}
            </span>
            <Badge
              className={cn(
                entry.estado === "ok" && "bg-emerald-100 text-emerald-800",
                entry.estado === "error" && "bg-red-100 text-red-800",
                entry.estado === "omitido" && "bg-stone-100 text-stone-600",
              )}
            >
              {entry.estado}
            </Badge>
            <time className="text-xs text-[var(--muted-foreground)]">
              {new Date(entry.timestamp).toLocaleTimeString("es-CO")}
            </time>
          </div>
          {entry.mensaje && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {entry.mensaje}
            </p>
          )}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Ver entrada/salida
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-[var(--muted)] p-2 text-[10px] leading-relaxed">
              {JSON.stringify(
                { entrada: entry.entrada, salida: entry.salida },
                null,
                2,
              )}
            </pre>
          </details>
        </li>
      ))}
    </ol>
  );
}
