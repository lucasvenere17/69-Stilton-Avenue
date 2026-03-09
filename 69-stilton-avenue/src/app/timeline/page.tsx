"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAppStore } from "@/lib/store";
import type { RenovationProject, ProjectStatus } from "@/lib/types";

// ── Status colors for bars ──
const STATUS_COLORS: Record<ProjectStatus, { fill: string; stroke: string; label: string }> = {
  not_started: { fill: "#d1d5db", stroke: "#9ca3af", label: "Not Started" },
  getting_quotes: { fill: "#93c5fd", stroke: "#3b82f6", label: "Getting Quotes" },
  quoted: { fill: "#a5b4fc", stroke: "#6366f1", label: "Quoted" },
  scheduled: { fill: "#fcd34d", stroke: "#f59e0b", label: "Scheduled" },
  in_progress: { fill: "#93c5fd", stroke: "#2563eb", label: "In Progress" },
  inspection_needed: { fill: "#c4b5fd", stroke: "#7c3aed", label: "Inspection Needed" },
  on_hold: { fill: "#fca5a5", stroke: "#dc2626", label: "On Hold" },
  completed: { fill: "#86efac", stroke: "#16a34a", label: "Completed" },
};

const SUBTASK_STATUS_COLORS: Record<string, string> = {
  not_started: "#e5e7eb",
  in_progress: "#bfdbfe",
  completed: "#bbf7d0",
};

// ── Timeline constants ──
const ROW_HEIGHT = 60;
const SUB_ROW_HEIGHT = 20;
const HEADER_HEIGHT = 50;
const LABEL_WIDTH = 220;
const MONTH_WIDTH = 140;
const BAR_HEIGHT = 28;
const SUB_BAR_HEIGHT = 14;
const BAR_Y_OFFSET = 16;

// Timeline: April 2026 - December 2026 (9 months)
const TIMELINE_START = new Date(2026, 3, 1); // April 1, 2026
const TIMELINE_END = new Date(2026, 11, 31); // December 31, 2026
const MONTHS = [
  "Apr 2026", "May 2026", "Jun 2026", "Jul 2026",
  "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026",
];

function dateToX(date: Date): number {
  const totalDays = (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24);
  const dayOffset = (date.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24);
  const totalWidth = MONTHS.length * MONTH_WIDTH;
  return Math.max(0, Math.min(totalWidth, (dayOffset / totalDays) * totalWidth));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function TimelinePage() {
  const { projects, loadProjects } = useAppStore();
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    project: RenovationProject;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Calculate row positions with sub-tasks
  const rowData = useMemo(() => {
    let currentY = HEADER_HEIGHT;
    return projects.map((project) => {
      const y = currentY;
      const subTaskCount = project.subTasks?.length || 0;
      const rowTotalHeight = ROW_HEIGHT + subTaskCount * SUB_ROW_HEIGHT;
      currentY += rowTotalHeight;
      return { project, y, height: rowTotalHeight, subTaskCount };
    });
  }, [projects]);

  const totalChartWidth = MONTHS.length * MONTH_WIDTH;
  const totalHeight = rowData.length > 0
    ? rowData[rowData.length - 1].y + rowData[rowData.length - 1].height + 20
    : HEADER_HEIGHT + 100;

  // Today line
  const today = new Date();
  const todayX = dateToX(today);
  const showTodayLine = today >= TIMELINE_START && today <= TIMELINE_END;

  const handleMouseEnter = (project: RenovationProject, e: React.MouseEvent) => {
    setHoveredProject(project.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipInfo({
        project,
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredProject(null);
    setTooltipInfo(null);
  };

  const handleMouseMove = (project: RenovationProject, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipInfo({
        project,
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 10,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Timeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gantt chart view of all renovation projects (April - December 2026)
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(["not_started", "in_progress", "completed", "on_hold"] as ProjectStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-4 h-3 rounded-sm border"
              style={{
                backgroundColor: STATUS_COLORS[status].fill,
                borderColor: STATUS_COLORS[status].stroke,
              }}
            />
            <span className="text-muted-foreground">{STATUS_COLORS[status].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-0.5 h-4 bg-red-500" />
          <span className="text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="10">
            <line x1="0" y1="5" x2="15" y2="5" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
            <polygon points="15,2 20,5 15,8" fill="#f59e0b" />
          </svg>
          <span className="text-muted-foreground">Dependency</span>
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="border rounded-lg bg-white overflow-x-auto relative"
        style={{ maxHeight: "calc(100vh - 250px)" }}
      >
        <svg
          ref={svgRef}
          width={LABEL_WIDTH + totalChartWidth + 20}
          height={totalHeight}
          className="select-none"
        >
          {/* ── Month headers ── */}
          <g>
            {MONTHS.map((month, i) => (
              <g key={month}>
                <rect
                  x={LABEL_WIDTH + i * MONTH_WIDTH}
                  y={0}
                  width={MONTH_WIDTH}
                  height={HEADER_HEIGHT}
                  fill={i % 2 === 0 ? "#f9fafb" : "#ffffff"}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
                <text
                  x={LABEL_WIDTH + i * MONTH_WIDTH + MONTH_WIDTH / 2}
                  y={HEADER_HEIGHT / 2 + 5}
                  textAnchor="middle"
                  className="text-xs font-medium"
                  fill="#6b7280"
                  fontSize={12}
                >
                  {month}
                </text>
              </g>
            ))}
          </g>

          {/* ── Column grid lines ── */}
          {MONTHS.map((_, i) => (
            <line
              key={`grid-${i}`}
              x1={LABEL_WIDTH + i * MONTH_WIDTH}
              y1={HEADER_HEIGHT}
              x2={LABEL_WIDTH + i * MONTH_WIDTH}
              y2={totalHeight}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}

          {/* ── Row backgrounds and labels ── */}
          {rowData.map(({ project, y, height }, idx) => (
            <g key={project.id}>
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={LABEL_WIDTH + totalChartWidth + 20}
                height={height}
                fill={idx % 2 === 0 ? "#ffffff" : "#fafafa"}
                stroke="#f3f4f6"
                strokeWidth={0.5}
              />
              {/* Project label */}
              <foreignObject x={8} y={y + BAR_Y_OFFSET - 6} width={LABEL_WIDTH - 16} height={BAR_HEIGHT}>
                <div
                  className="text-xs font-medium text-gray-800 truncate leading-7"
                  title={project.name}
                  style={{ fontSize: 11 }}
                >
                  {project.name}
                </div>
              </foreignObject>
            </g>
          ))}

          {/* ── Dependency arrows ── */}
          {rowData.map(({ project, y }) => {
            if (!project.dependsOn || project.dependsOn.length === 0) return null;
            return project.dependsOn.map((depId) => {
              const depRow = rowData.find((r) => r.project.id === depId);
              if (!depRow) return null;
              const depProject = depRow.project;

              // Arrow from end of dependency to start of this project
              const depEndDate = depProject.estimatedEndDate
                ? new Date(depProject.estimatedEndDate + "T00:00:00")
                : null;
              const thisStartDate = project.estimatedStartDate
                ? new Date(project.estimatedStartDate + "T00:00:00")
                : null;

              if (!depEndDate || !thisStartDate) return null;

              const x1 = LABEL_WIDTH + dateToX(depEndDate);
              const y1 = depRow.y + BAR_Y_OFFSET + BAR_HEIGHT / 2;
              const x2 = LABEL_WIDTH + dateToX(thisStartDate);
              const y2 = y + BAR_Y_OFFSET + BAR_HEIGHT / 2;

              // Draw a path: right, then down/up, then right to target
              const midX = x1 + (x2 - x1) / 2;

              return (
                <g key={`dep-${depId}-${project.id}`}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 6} ${y2}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4,3"
                    opacity={0.7}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points={`${x2 - 6},${y2 - 3} ${x2},${y2} ${x2 - 6},${y2 + 3}`}
                    fill="#f59e0b"
                    opacity={0.7}
                  />
                </g>
              );
            });
          })}

          {/* ── Project bars ── */}
          {rowData.map(({ project, y }) => {
            if (!project.estimatedStartDate || !project.estimatedEndDate) return null;

            const startDate = new Date(project.estimatedStartDate + "T00:00:00");
            const endDate = new Date(project.estimatedEndDate + "T00:00:00");
            const barX = LABEL_WIDTH + dateToX(startDate);
            const barWidth = Math.max(dateToX(endDate) - dateToX(startDate), 8);
            const barY = y + BAR_Y_OFFSET;
            const colors = STATUS_COLORS[project.status];
            const isHovered = hoveredProject === project.id;

            return (
              <g key={`bar-${project.id}`}>
                {/* Main project bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={BAR_HEIGHT}
                  rx={4}
                  ry={4}
                  fill={colors.fill}
                  stroke={isHovered ? "#1d4ed8" : colors.stroke}
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={(e) => handleMouseEnter(project, e)}
                  onMouseMove={(e) => handleMouseMove(project, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{ filter: isHovered ? "brightness(0.95)" : undefined }}
                />
                {/* Bar label */}
                {barWidth > 60 && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY + BAR_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize={10}
                    fontWeight={500}
                    pointerEvents="none"
                  >
                    {project.estimatedCost
                      ? `$${(project.estimatedCost / 1000).toFixed(0)}K`
                      : "TBD"}
                  </text>
                )}

                {/* Sub-task bars */}
                {project.subTasks?.map((st, stIdx) => {
                  // Sub-tasks are distributed proportionally within the project bar
                  const stCount = project.subTasks?.length || 1;
                  const stWidth = barWidth / stCount;
                  const stX = barX + stIdx * stWidth;
                  const stY = barY + BAR_HEIGHT + 4 + stIdx * SUB_ROW_HEIGHT;
                  const stFill = SUBTASK_STATUS_COLORS[st.status] || "#e5e7eb";

                  return (
                    <g key={st.id}>
                      <rect
                        x={stX}
                        y={stY}
                        width={Math.max(stWidth - 2, 4)}
                        height={SUB_BAR_HEIGHT}
                        rx={2}
                        ry={2}
                        fill={stFill}
                        stroke="#d1d5db"
                        strokeWidth={0.5}
                      />
                      {stWidth > 40 && (
                        <text
                          x={stX + (stWidth - 2) / 2}
                          y={stY + SUB_BAR_HEIGHT / 2 + 3}
                          textAnchor="middle"
                          fill="#6b7280"
                          fontSize={8}
                          pointerEvents="none"
                        >
                          {st.title.length > 12 ? st.title.slice(0, 12) + "..." : st.title}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ── Today line ── */}
          {showTodayLine && (
            <g>
              <line
                x1={LABEL_WIDTH + todayX}
                y1={HEADER_HEIGHT}
                x2={LABEL_WIDTH + todayX}
                y2={totalHeight}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6,3"
              />
              <rect
                x={LABEL_WIDTH + todayX - 18}
                y={HEADER_HEIGHT - 2}
                width={36}
                height={14}
                rx={3}
                fill="#ef4444"
              />
              <text
                x={LABEL_WIDTH + todayX}
                y={HEADER_HEIGHT + 9}
                textAnchor="middle"
                fill="white"
                fontSize={9}
                fontWeight={600}
              >
                Today
              </text>
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {tooltipInfo && (
          <div
            className="absolute bg-white border rounded-lg shadow-lg p-3 z-50 pointer-events-none max-w-xs"
            style={{
              left: Math.min(tooltipInfo.x, (containerRef.current?.clientWidth || 600) - 250),
              top: tooltipInfo.y,
            }}
          >
            <div className="font-semibold text-sm mb-1">{tooltipInfo.project.name}</div>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {tooltipInfo.project.estimatedStartDate && (
                <div>
                  Dates: {formatDate(tooltipInfo.project.estimatedStartDate)}
                  {tooltipInfo.project.estimatedEndDate && ` - ${formatDate(tooltipInfo.project.estimatedEndDate)}`}
                </div>
              )}
              <div>
                Status:{" "}
                <span
                  className="font-medium"
                  style={{ color: STATUS_COLORS[tooltipInfo.project.status].stroke }}
                >
                  {STATUS_COLORS[tooltipInfo.project.status].label}
                </span>
              </div>
              {tooltipInfo.project.estimatedCost !== undefined && tooltipInfo.project.estimatedCost > 0 && (
                <div>Budget: ${tooltipInfo.project.estimatedCost.toLocaleString()}</div>
              )}
              {(tooltipInfo.project.subTasks?.length || 0) > 0 && (
                <div>
                  Sub-tasks: {tooltipInfo.project.subTasks?.filter((st) => st.status === "completed").length}/
                  {tooltipInfo.project.subTasks?.length} completed
                </div>
              )}
              {tooltipInfo.project.dependsOn.length > 0 && (
                <div>
                  Dependencies:{" "}
                  {tooltipInfo.project.dependsOn
                    .map((depId) => {
                      const dep = projects.find((p) => p.id === depId);
                      return dep?.name || "Unknown";
                    })
                    .join(", ")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-3 font-medium">Project</th>
              <th className="text-left p-3 font-medium">Start</th>
              <th className="text-left p-3 font-medium">End</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Budget</th>
              <th className="text-left p-3 font-medium">Dependencies</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{project.name}</td>
                <td className="p-3 text-muted-foreground">
                  {project.estimatedStartDate ? formatDate(project.estimatedStartDate) : "--"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {project.estimatedEndDate ? formatDate(project.estimatedEndDate) : "--"}
                </td>
                <td className="p-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: STATUS_COLORS[project.status].fill,
                      color: STATUS_COLORS[project.status].stroke,
                    }}
                  >
                    {STATUS_COLORS[project.status].label}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {project.estimatedCost ? `$${project.estimatedCost.toLocaleString()}` : "TBD"}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {project.dependsOn.length > 0
                    ? project.dependsOn
                        .map((depId) => {
                          const dep = projects.find((p) => p.id === depId);
                          return dep?.name || "Unknown";
                        })
                        .join(", ")
                    : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
