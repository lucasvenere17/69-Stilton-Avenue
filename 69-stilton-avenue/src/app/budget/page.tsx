"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type { BudgetItem } from "@/lib/types";
import { Link2, CheckCircle2, Pencil, Download } from "lucide-react";

type BudgetTab = "renovation" | "furniture" | "all";

function formatCurrency(amount: number): string {
  if (amount === 0) return "TBD";
  return `$${amount.toLocaleString()}`;
}

function groupByCategory(items: BudgetItem[]): Record<string, BudgetItem[]> {
  const groups: Record<string, BudgetItem[]> = {};
  items.forEach((item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  return groups;
}

// ── Editable Cost Cell ──
function EditableCostCell({
  value,
  onSave,
  placeholder,
}: {
  value: number;
  onSave: (val: number) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value));

  const commit = () => {
    const parsed = parseFloat(tempVal) || 0;
    if (parsed !== value) onSave(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="border rounded px-2 py-1 text-sm w-28 text-right focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
        min={0}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setTempVal(String(value));
        setEditing(true);
      }}
      className="text-right w-full hover:bg-primary/5 rounded px-2 py-1 -mx-2 transition group"
      title="Click to edit"
    >
      <span>{value > 0 ? `$${value.toLocaleString()}` : (placeholder || "TBD")}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 inline ml-1.5" />
    </button>
  );
}

function CategoryTable({
  category,
  items,
  onUpdateCost,
  projects,
}: {
  category: string;
  items: BudgetItem[];
  onUpdateCost: (item: BudgetItem, field: "estimatedCost" | "actualCost", value: number) => void;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const subtotal = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const actualSubtotal = items.reduce((sum, item) => sum + item.actualCost, 0);

  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">{category}</h3>
        <span className="text-sm font-medium">
          {formatCurrency(subtotal)}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/20">
            <th className="text-left p-3 font-medium w-2/5">Item</th>
            <th className="text-right p-3 font-medium w-1/5">Estimated</th>
            <th className="text-right p-3 font-medium w-1/5">Actual</th>
            <th className="text-right p-3 font-medium w-1/5">Difference</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const diff = item.actualCost > 0 ? item.estimatedCost - item.actualCost : 0;
            const linkedProject = item.projectId
              ? projects.find((p) => p.id === item.projectId)
              : null;

            return (
              <tr
                key={item.id}
                className="border-b hover:bg-muted/30"
              >
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{item.name}</span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        View
                      </a>
                    )}
                    {linkedProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects?highlight=${item.projectId}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        title={`Linked to: ${linkedProject.name}`}
                      >
                        <Link2 className="w-3 h-3" />
                        {linkedProject.name}
                      </button>
                    )}
                    {item.acceptedQuoteContractor && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Quote: {item.acceptedQuoteContractor}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <EditableCostCell
                    value={item.estimatedCost}
                    onSave={(val) => onUpdateCost(item, "estimatedCost", val)}
                  />
                </td>
                <td className="p-3 text-right">
                  <EditableCostCell
                    value={item.actualCost}
                    onSave={(val) => onUpdateCost(item, "actualCost", val)}
                    placeholder="--"
                  />
                </td>
                <td className={`p-3 text-right ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {item.actualCost > 0
                    ? `${diff >= 0 ? "+" : ""}$${diff.toLocaleString()}`
                    : "--"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 font-medium">
            <td className="p-3">{category} Subtotal</td>
            <td className="p-3 text-right">{formatCurrency(subtotal)}</td>
            <td className="p-3 text-right">
              {actualSubtotal > 0 ? `$${actualSubtotal.toLocaleString()}` : "--"}
            </td>
            <td className="p-3 text-right">
              {actualSubtotal > 0
                ? `${subtotal - actualSubtotal >= 0 ? "+" : ""}$${(subtotal - actualSubtotal).toLocaleString()}`
                : "--"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── CSV Export Helper ──
function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportBudgetCsv(renovation: BudgetItem[], furniture: BudgetItem[]) {
  const headers = ["Category", "Item Name", "Estimated Cost", "Actual Cost", "Difference", "Budget Type"];
  const rows: string[] = [];

  // Renovation section
  if (renovation.length > 0) {
    rows.push("--- Renovation Budget ---,,,,, ");
    for (const item of renovation) {
      const diff = item.actualCost > 0 ? item.estimatedCost - item.actualCost : 0;
      rows.push([
        escapeCsvValue(item.category),
        escapeCsvValue(item.name),
        item.estimatedCost,
        item.actualCost,
        diff,
        "Renovation",
      ].join(","));
    }
    const renTotal = renovation.reduce((s, i) => s + i.estimatedCost, 0);
    const renActual = renovation.reduce((s, i) => s + i.actualCost, 0);
    rows.push(`,Renovation Subtotal,${renTotal},${renActual},${renTotal - renActual},`);
    rows.push("");
  }

  // Furniture section
  if (furniture.length > 0) {
    rows.push("--- Furniture Budget ---,,,,, ");
    for (const item of furniture) {
      const diff = item.actualCost > 0 ? item.estimatedCost - item.actualCost : 0;
      rows.push([
        escapeCsvValue(item.category),
        escapeCsvValue(item.name),
        item.estimatedCost,
        item.actualCost,
        diff,
        "Furniture",
      ].join(","));
    }
    const furTotal = furniture.reduce((s, i) => s + i.estimatedCost, 0);
    const furActual = furniture.reduce((s, i) => s + i.actualCost, 0);
    rows.push(`,Furniture Subtotal,${furTotal},${furActual},${furTotal - furActual},`);
    rows.push("");
  }

  // Grand totals
  const allItems = [...renovation, ...furniture];
  const grandEst = allItems.reduce((s, i) => s + i.estimatedCost, 0);
  const grandActual = allItems.reduce((s, i) => s + i.actualCost, 0);
  rows.push(`,GRAND TOTAL,${grandEst},${grandActual},${grandEst - grandActual},`);

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `69-stilton-budget-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BudgetPage() {
  const {
    budgetData, loadBudgets, saveBudgets, updateBudgetItemCost,
    projects, loadProjects,
    toastMessage, setToastMessage,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<BudgetTab>("renovation");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBudgets();
    loadProjects();
  }, [loadBudgets, loadProjects]);

  const renovationItems = budgetData.renovation;
  const furnitureItems = budgetData.furniture;

  const projectsList = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name })),
    [projects]
  );

  const renovationTotal = useMemo(
    () => renovationItems.reduce((sum, item) => sum + item.estimatedCost, 0),
    [renovationItems]
  );

  const furnitureTotal = useMemo(
    () => furnitureItems.reduce((sum, item) => sum + item.estimatedCost, 0),
    [furnitureItems]
  );

  const renovationActualTotal = useMemo(
    () => renovationItems.reduce((sum, item) => sum + item.actualCost, 0),
    [renovationItems]
  );

  const furnitureActualTotal = useMemo(
    () => furnitureItems.reduce((sum, item) => sum + item.actualCost, 0),
    [furnitureItems]
  );

  const combinedTotal = renovationTotal + furnitureTotal;
  const combinedActualTotal = renovationActualTotal + furnitureActualTotal;

  const renovationGroups = useMemo(() => groupByCategory(renovationItems), [renovationItems]);
  const furnitureGroups = useMemo(() => groupByCategory(furnitureItems), [furnitureItems]);

  const linkedCount = useMemo(
    () => renovationItems.filter((item) => item.subTaskId).length,
    [renovationItems]
  );

  const handleUpdateCost = (item: BudgetItem, field: "estimatedCost" | "actualCost", value: number) => {
    // Use the syncing version that also updates linked sub-tasks
    updateBudgetItemCost(item.id, field, value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBudgets();
    } finally {
      setSaving(false);
    }
  };

  const showRenovation = activeTab === "renovation" || activeTab === "all";
  const showFurniture = activeTab === "furniture" || activeTab === "all";

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white shrink-0 ml-2"
          >
            x
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget Tracker</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportBudgetCsv(renovationItems, furnitureItems)}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-accent transition"
          >
            <Download className="w-4 h-4" />
            Export Budget
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Renovation Budget</div>
          <div className="text-2xl font-bold mt-1">${renovationTotal.toLocaleString()}</div>
          {renovationActualTotal > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Actual: ${renovationActualTotal.toLocaleString()}
            </div>
          )}
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Furniture Budget</div>
          <div className="text-2xl font-bold mt-1">${furnitureTotal.toLocaleString()}</div>
          {furnitureActualTotal > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Actual: ${furnitureActualTotal.toLocaleString()}
            </div>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-primary/5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Combined Total</div>
          <div className="text-2xl font-bold mt-1">${combinedTotal.toLocaleString()}</div>
          {combinedActualTotal > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Actual: ${combinedActualTotal.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Linked items info */}
      {linkedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <span>
            <strong className="text-blue-700">{linkedCount}</strong> renovation budget items are linked to project sub-tasks.
            Cost changes sync automatically.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b">
        {(["renovation", "furniture", "all"] as BudgetTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            }`}
          >
            {tab === "renovation" ? "Renovation Budget" : tab === "furniture" ? "Furniture Budget" : "All"}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          Estimates are approximate. Click any row to edit costs. Linked items sync to their project sub-tasks automatically.
        </p>
      </div>

      {/* Renovation Section */}
      {showRenovation && (
        <div>
          {activeTab === "all" && (
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Renovation Budget
              <span className="text-sm font-normal text-muted-foreground">
                (${renovationTotal.toLocaleString()})
              </span>
            </h3>
          )}
          {Object.entries(renovationGroups).map(([category, items]) => (
            <CategoryTable
              key={category}
              category={category}
              items={items}
              onUpdateCost={handleUpdateCost}
              projects={projectsList}
            />
          ))}
          {activeTab === "renovation" && (
            <div className="border rounded-lg p-4 bg-muted/50 font-bold flex justify-between">
              <span>Renovation Grand Total</span>
              <span>${renovationTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Furniture Section */}
      {showFurniture && (
        <div>
          {activeTab === "all" && (
            <h3 className="text-lg font-semibold mb-3 mt-6 flex items-center gap-2">
              Furniture Budget
              <span className="text-sm font-normal text-muted-foreground">
                (${furnitureTotal.toLocaleString()})
              </span>
            </h3>
          )}
          {Object.entries(furnitureGroups).map(([category, items]) => (
            <CategoryTable
              key={category}
              category={category}
              items={items}
              onUpdateCost={handleUpdateCost}
              projects={projectsList}
            />
          ))}
          {activeTab === "furniture" && (
            <div className="border rounded-lg p-4 bg-muted/50 font-bold flex justify-between">
              <span>Furniture Grand Total</span>
              <span>${furnitureTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Combined Total (All tab) */}
      {activeTab === "all" && (
        <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 font-bold flex justify-between text-lg">
          <span>Combined Grand Total</span>
          <span>${combinedTotal.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
