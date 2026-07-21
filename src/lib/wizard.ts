import type { Operacion } from "@/lib/schemas";

export type WizardStep = "register" | "plan" | "impact";

const stepOrder: WizardStep[] = ["register", "plan", "impact"];

export type WizardState = {
  step: WizardStep;
  texto: string;
  operacion: Operacion | null;
  compradorSeleccionado: string;
};

export function canNavigateTo(current: WizardStep, target: WizardStep): boolean {
  return stepOrder.indexOf(target) <= stepOrder.indexOf(current);
}

/** La navegación cambia sólo el paso: nunca descarta la información capturada. */
export function navigateWizard(state: WizardState, step: WizardStep): WizardState {
  return { ...state, step };
}
