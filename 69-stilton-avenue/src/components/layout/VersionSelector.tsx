"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function VersionSelector() {
  const {
    scenarios,
    activeScenarioId,
    setActiveScenario,
    loadScenarios,
    createScenario,
    duplicateScenario,
    saveScenario,
  } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createScenario(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  const handleDuplicate = async () => {
    if (!activeScenarioId) return;
    const name = `${activeScenario?.name || "Scenario"} (Copy)`;
    await duplicateScenario(activeScenarioId, name);
  };

  const handleSave = async () => {
    if (activeScenario) {
      await saveScenario(activeScenario);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={activeScenarioId || ""}
        onChange={(e) => setActiveScenario(e.target.value)}
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
      >
        {scenarios.length === 0 && (
          <option value="">No scenarios</option>
        )}
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <button
        onClick={handleSave}
        disabled={!activeScenarioId}
        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        Save
      </button>

      <button
        onClick={handleDuplicate}
        disabled={!activeScenarioId}
        className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent disabled:opacity-50"
      >
        Duplicate
      </button>

      {showCreate ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name..."
            className="border rounded-md px-2 py-1.5 text-sm w-40"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="px-2 py-1.5 text-sm bg-primary text-primary-foreground rounded-md"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreate(false)}
            className="px-2 py-1.5 text-sm border rounded-md"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
        >
          + New
        </button>
      )}
    </div>
  );
}
