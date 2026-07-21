# AgrarIA

Rescate de cosechas con lenguaje natural, herramientas TypeScript y aprobación humana.

## Qué hace

1. **Registrar cosecha** — La productora describe el lote (ej. caso María: 900 kg de tomate maduro).
2. **Plan de rescate** — Extrae datos, calcula urgencia, busca compradores simulados, divide el lote y estima ingreso neto.
3. **Aprobación e impacto** — Muestra métricas, historial y traza; nada se confirma sin aprobación humana.

**Momento diferenciador:** botón *El comprador canceló* → el principal queda no disponible, se redistribuye el lote y se conserva el historial.

## Stack

- Next.js App Router · TypeScript · Tailwind CSS · shadcn-style UI
- OpenAI Responses API + function calling + Zod
- Datos locales JSON (sin auth ni DB)

## Herramientas

| Tool | Rol |
|------|-----|
| `extraer_lote` | Estructura el lote desde NL |
| `calcular_urgencia` | Ventana y score por madurez |
| `buscar_compradores` | Compradores simulados compatibles |
| `calcular_ingreso_neto` | Precios/costos en TypeScript |
| `optimizar_distribucion` | Divide sin superar volumen |
| `replanificar_operacion` | Redistribuye tras cancelación |
| `registrar_traza` | Auditoría de decisiones |

## Arranque

```bash
npm install
cp .env.example .env.local
# Opcional: OPENAI_API_KEY=sk-...
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Sin `OPENAI_API_KEY` la demo funciona en modo **fallback local** (mismas herramientas TypeScript).

## Pruebas

```bash
npm test
```

Cubre cantidades (suma ≤ volumen), cancelación + historial, y flujo de aprobación.

## Criterio de aceptación (caso María)

1. Cargar / pegar el caso María → plan para 900 kg.
2. Pulsar **El comprador canceló** → nuevo plan, historial intacto.
3. **Aprobar** → traza completa + métricas de impacto.

## Reglas de negocio

- La suma asignada nunca supera el volumen disponible.
- Cálculos monetarios solo en TypeScript.
- Ninguna operación se confirma sin aprobación humana.
- Datos de compradores etiquetados como **SIMULADO**.
- Errores de OpenAI no rompen la demo (fallback automático).
