import type { Operacion } from "@/lib/schemas";

const globalStore = globalThis as unknown as {
  __agrariaOps?: Map<string, Operacion>;
};

function getMap(): Map<string, Operacion> {
  if (!globalStore.__agrariaOps) {
    globalStore.__agrariaOps = new Map();
  }
  return globalStore.__agrariaOps;
}

export function saveOperacion(op: Operacion): void {
  getMap().set(op.id, op);
}

export function getOperacion(id: string): Operacion | undefined {
  return getMap().get(id);
}

export function updateOperacion(
  id: string,
  updater: (op: Operacion) => Operacion,
): Operacion | undefined {
  const current = getMap().get(id);
  if (!current) return undefined;
  const next = updater(current);
  getMap().set(id, next);
  return next;
}
