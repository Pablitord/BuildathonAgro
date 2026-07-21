"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import examples from "@/data/examples.json";
import { Leaf, Loader2, Sparkles } from "lucide-react";

const CASO_MARIA = examples.caso_maria.texto;

type Props = {
  texto: string;
  onTextoChange: (texto: string) => void;
  onPlanReady: (operacion: unknown) => void;
  onLoadingChange: (loading: boolean) => void;
};

export function RegisterHarvest({ texto, onTextoChange, onPlanReady, onLoadingChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    onLoadingChange(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al generar el plan");
      }
      onPlanReady(data.operacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl animate-fade-up">
      <div className="mb-8 text-center">
        <Badge className="mb-4 bg-[var(--accent-soft)] text-[var(--accent)]">
          Datos simulados · Sin autenticación
        </Badge>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--foreground)] sm:text-5xl">
          AgrarIA
        </h1>
        <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">
          Registra tu cosecha en lenguaje natural. El agente estructura el lote,
          calcula urgencia y propone un plan de rescate.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-6 shadow-lg backdrop-blur-sm"
      >
        <label
          htmlFor="cosecha"
          className="mb-2 flex items-center gap-2 text-sm font-medium"
        >
          <Leaf className="h-4 w-4 text-[var(--primary)]" />
          Descripción de la cosecha
        </label>
        <Textarea
          id="cosecha"
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          rows={6}
          className="resize-y text-base leading-relaxed"
          placeholder="Ej: Coseché 900 kg de tomate maduro..."
          required
          minLength={10}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={loading || texto.length < 10}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando plan…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar plan de rescate
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onTextoChange(CASO_MARIA)}
            disabled={loading}
          >
            Cargar caso María
          </Button>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
