"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { BudgetLineItem } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { exportScenarioJSON, generateShareUrl } from "@/lib/scenarioManager";

const DEFAULT_CATEGORIES = [
  "Demolition",
  "Framing",
  "Electrical",
  "Plumbing",
  "Cabinetry",
  "Countertops",
  "Flooring",
  "Paint",
  "Fixtures",
];

const DEFAULT_ITEMS: Omit<BudgetLineItem, "id">[] = [
  { category: "Demolition", description: "Remove existing kitchen cabinets", quantity: 1, unit: "lot", unitCost: 2500, subtotal: 2500 },
  { category: "Demolition", description: "Remove flooring", quantity: 800, unit: "sqft", unitCost: 3, subtotal: 2400 },
  { category: "Framing", description: "New wall framing", quantity: 1, unit: "lot", unitCost: 3000, subtotal: 3000 },
  { category: "Electrical", description: "Electrical updates", quantity: 1, unit: "lot", unitCost: 5000, subtotal: 5000 },
  { category: "Plumbing", description: "Plumbing rough-in", quantity: 1, unit: "lot", unitCost: 4000, subtotal: 4000 },
  { category: "Cabinetry", description: "New kitchen cabinets", quantity: 20, unit: "linear ft", unitCost: 350, subtotal: 7000 },
  { category: "Countertops", description: "Quartz countertops", quantity: 45, unit: "sqft", unitCost: 85, subtotal: 3825 },
  { category: "Flooring", description: "Engineered hardwood", quantity: 800, unit: "sqft", unitCost: 12, subtotal: 9600 },
  { category: "Paint", description: "Interior painting", quantity: 2500, unit: "sqft", unitCost: 4, subtotal: 10000 },
  { category: "Fixtures", description: "Light fixtures", quantity: 15, unit: "each", unitCost: 200, subtotal: 3000 },
];

export default function BudgetPage() {
  const { activeScenarioId, scenarios, addBudgetItem, updateBudgetItem, removeBudgetItem, saveScenario } = useAppStore();
  const scenario = scenarios.find((s) => s.id === activeScenarioId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const items = useMemo(() => scenario?.budgetItems || [], [scenario?.budgetItems]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    items.forEach((item) => {
      totals[item.category] = (totals[item.category] || 0) + item.subtotal;
    });
    return totals;
  }, [items]);

  const handleAddDefaults = useCallback(() => {
    DEFAULT_ITEMS.forEach((item) => {
      addBudgetItem({ ...item, id: uuidv4() });
    });
  }, [addBudgetItem]);

  const handleAddItem = useCallback(() => {
    addBudgetItem({
      id: uuidv4(),
      category: DEFAULT_CATEGORIES[0],
      description: "",
      quantity: 1,
      unit: "each",
      unitCost: 0,
      subtotal: 0,
    });
  }, [addBudgetItem]);

  const handleUpdateField = (item: BudgetLineItem, field: keyof BudgetLineItem, value: string | number) => {
    const updated = { ...item, [field]: value };
    if (field === "quantity" || field === "unitCost") {
      updated.subtotal = Number(updated.quantity) * Number(updated.unitCost);
    }
    updateBudgetItem(updated);
  };

  const handleSave = async () => {
    if (scenario) await saveScenario(scenario);
  };

  const handleExport = () => {
    if (!scenario) return;
    const json = exportScenarioJSON(scenario);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenario.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (!activeScenarioId) return;
    const url = generateShareUrl(activeScenarioId);
    setShareUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
  };

  if (!scenario) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Create a scenario first using the header controls.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800 font-medium">
          These estimates are approximate and not final. Actual costs require contractor quotes.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget Estimation</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Save
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
          >
            Export JSON
          </button>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
          >
            Share Link
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm flex items-center justify-between">
          <span className="truncate">{shareUrl}</span>
          <button
            onClick={() => setShareUrl(null)}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No budget items yet.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleAddDefaults}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Load Default Estimates
            </button>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 border rounded-md text-sm hover:bg-accent"
            >
              Add Empty Item
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Category Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(categoryTotals).map(([cat, catTotal]) => (
              <div key={cat} className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{cat}</div>
                <div className="text-lg font-semibold">
                  ${catTotal.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Budget Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-left p-3 font-medium">Unit</th>
                  <th className="text-right p-3 font-medium">Unit Cost</th>
                  <th className="text-right p-3 font-medium">Subtotal</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => setEditingId(item.id === editingId ? null : item.id)}
                  >
                    <td className="p-3">
                      {editingId === item.id ? (
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateField(item, "category", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-1 text-sm w-full"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-muted rounded">{item.category}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateField(item, "description", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                      ) : (
                        item.description || <span className="text-muted-foreground italic">No description</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateField(item, "quantity", Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-1 text-sm w-20 text-right"
                        />
                      ) : (
                        item.quantity.toLocaleString()
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateField(item, "unit", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-1 text-sm w-20"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => handleUpdateField(item, "unitCost", Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-1 text-sm w-24 text-right"
                        />
                      ) : (
                        `$${item.unitCost.toLocaleString()}`
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${item.subtotal.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBudgetItem(item.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td colSpan={5} className="p-3 text-right">Total Estimated Cost</td>
                  <td className="p-3 text-right text-lg">${total.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button
            onClick={handleAddItem}
            className="px-4 py-2 border rounded-md text-sm hover:bg-accent"
          >
            + Add Line Item
          </button>
        </>
      )}
    </div>
  );
}
