"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { loadScenarios, createScenario } = useAppStore();

  useEffect(() => {
    loadScenarios().then(() => {
      // Auto-create a default scenario if none exist
      const currentScenarios = useAppStore.getState().scenarios;
      if (currentScenarios.length === 0) {
        createScenario("Initial Renovation Plan");
      }
    });
  }, [loadScenarios, createScenario]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-3xl font-bold mb-4">Welcome to the Renovation Portal</h2>
      <p className="text-muted-foreground mb-8 max-w-lg">
        Explore renovation possibilities for 69 Stilton Avenue, Kleinburg, Ontario.
        Use the tabs above to compare before/after photos, customize the kitchen, and plan your budget.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        {[
          { href: "/projects", title: "Project Tracker", desc: "Track renovation projects, contractors, quotes, and timelines" },
          { href: "/communications", title: "Communications", desc: "Manage emails, outreach, and contractor communications" },
          { href: "/timeline", title: "Timeline", desc: "Gantt chart view of all project schedules and dependencies" },
          { href: "/before-after", title: "Before / After", desc: "Compare photos with AI-generated renovation previews" },
          { href: "/kitchen", title: "Kitchen Customizer", desc: "Try different materials, colors, and styles" },
          { href: "/budget", title: "Budget Estimation", desc: "Plan renovation costs with editable line items" },
        ].map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="p-6 border rounded-lg text-left hover:border-primary hover:shadow-md transition-all"
          >
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
