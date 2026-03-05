import type { Scenario } from "./types";

export function exportScenarioJSON(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function generateShareUrl(scenarioId: string): string {
  return `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/?scenario=${scenarioId}`;
}

export function validateScenario(data: unknown): data is Scenario {
  if (!data || typeof data !== "object") return false;
  const s = data as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.createdAt === "string" &&
    s.blueprintData !== undefined &&
    Array.isArray(s.budgetItems)
  );
}
