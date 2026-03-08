"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { BudgetItem } from "@/lib/types";

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
  onUpdateActualCost,
}: {
  category: string;
  items: BudgetItem[];
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onUpdateActualCost: (item: BudgetItem, value: number) => void;
}) {
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
            return (
              <tr
                key={item.id}
                className="border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => onEdit(item.id === editingId ? null : item.id)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
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
                  </div>
                </td>
                <td className="p-3 text-right">
                  {formatCurrency(item.estimatedCost)}
                </td>
                <td className="p-3 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={item.actualCost}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateActualCost(item, Number(e.target.value));
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
  const { budgetData, loadBudgets, saveBudgets, updateBudgetDataItem } = useAppStore();
  const [activeTab, setActiveTab] = useState<BudgetTab>("renovation");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const renovationItems = budgetData.renovation;
  const furnitureItems = budgetData.furniture;

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

  const handleUpdateActualCost = (item: BudgetItem, value: number) => {
    updateBudgetDataItem({ ...item, actualCost: value });
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
          Estimates are approximate. Click any row to enter actual costs as purchases are made.
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
              onUpdateActualCost={handleUpdateActualCost}
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
              onUpdateActualCost={handleUpdateActualCost}
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
