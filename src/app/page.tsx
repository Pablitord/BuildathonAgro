"use client";

import { useState } from "react";
import type { Operacion } from "@/lib/schemas";
import { RegisterHarvest } from "@/components/register-harvest";
import { RescuePlan } from "@/components/rescue-plan";
import { ApprovalImpact } from "@/components/approval-impact";
import { cn } from "@/lib/utils";
import examples from "@/data/examples.json";
import { canNavigateTo, type WizardStep } from "@/lib/wizard";

type Step = WizardStep;

const steps: { id: Step; label: string }[] = [
  { id: "register", label: "1. Registrar" },
  { id: "plan", label: "2. Plan" },
  { id: "impact", label: "3. Aprobación" },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>("register");
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [texto, setTexto] = useState(examples.caso_maria.texto);
  const [compradorSeleccionado, setCompradorSeleccionado] = useState("");
  const [apiLoading, setApiLoading] = useState(false);

  function changeStep(nextStep: Step) {
    if (apiLoading) return;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePlanReady(op: unknown) {
    setOperacion(op as Operacion);
    setCompradorSeleccionado("");
    changeStep("plan");
  }

  function handleRestart() {
    setOperacion(null);
    setCompradorSeleccionado("");
    changeStep("register");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 field-bg" aria-hidden />
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      <header className="relative z-10 border-b border-[var(--border)]/60 bg-[var(--background)]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-xl text-[var(--primary)]">AgrarIA</span>
            <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">Rescate de cosechas con IA</span>
          </div>
          <div className="flex items-center gap-3">
            {operacion && (
              <span className={cn(
                "hidden rounded-full px-2 py-1 text-xs font-medium sm:inline",
                operacion.modo === "openai" ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800",
              )}>
                {operacion.modo === "openai" ? "OpenAI activo" : "Modo de respaldo local"}
              </span>
            )}
            <nav className="flex gap-1 sm:gap-2" aria-label="Progreso del wizard">
              {steps.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={apiLoading || !canNavigateTo(step, item.id)}
                  onClick={() => changeStep(item.id)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50",
                    step === item.id
                      ? "bg-[var(--primary)] text-white"
                      : canNavigateTo(step, item.id)
                        ? "text-[var(--primary)] hover:bg-[var(--muted)]"
                        : "text-[var(--muted-foreground)]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-10 sm:py-14">
        {step === "register" && (
          <RegisterHarvest texto={texto} onTextoChange={setTexto} onPlanReady={handlePlanReady} onLoadingChange={setApiLoading} />
        )}
        {step === "plan" && operacion && (
          <RescuePlan
            operacion={operacion}
            onUpdated={setOperacion}
            onContinue={() => changeStep("impact")}
            onBack={() => changeStep("register")}
            compradorSeleccionado={compradorSeleccionado}
            onCompradorSeleccionado={setCompradorSeleccionado}
            onLoadingChange={setApiLoading}
          />
        )}
        {step === "impact" && operacion && (
          <ApprovalImpact
            operacion={operacion}
            onUpdated={setOperacion}
            onRestart={handleRestart}
            onReviewPlan={() => changeStep("plan")}
            onLoadingChange={setApiLoading}
          />
        )}
      </main>
    </div>
  );
}
