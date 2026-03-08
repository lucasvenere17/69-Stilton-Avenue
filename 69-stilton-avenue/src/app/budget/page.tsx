"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type { BudgetItem } from "@/lib/types";
import { Link2, CheckCircle2 } from "lucide-react";

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

function CategoryTable({
  category,
  items,
  editingId,
  onEdit,
  onUpdateCost,
  projects,
}: {
  category: string;
  items: BudgetItem[];
  editingId: string | null;
  onEdit: (id: string | null) => void;
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
                className="border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => onEdit(item.id === editingId ? null : item.id)}
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
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={item.estimatedCost}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateCost(item, "estimatedCost", Number(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="border rounded px-2 py-1 text-sm w-24 text-right"
                      min={0}
                    />
                  ) : (
                    formatCurrency(item.estimatedCost)
                  )}
                </td>
                <td className="p-3 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={item.actualCost}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateCost(item, "actualCost", Number(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="border rounded px-2 py-1 text-sm w-24 text-right"
                      min={0}
                    />
                  ) : item.actualCost > 0 ? (
                    `$${item.actualCost.toLocaleString()}`
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
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

export default function BudgetPage() {
  const {
    budgetData, loadBudgets, saveBudgets, updateBudgetItemCost,
    projects, loadProjects,
    toastMessage, setToastMessage,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<BudgetTab>("renovation");
  const [editingId, setEditingId] = useState<string | null>(null);
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
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
              editingId={editingId}
              onEdit={setEditingId}
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
              editingId={editingId}
              onEdit={setEditingId}
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
