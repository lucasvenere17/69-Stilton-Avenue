"use client";

import VersionSelector from "./VersionSelector";

export default function Header() {
  return (
    <header className="bg-white border-b px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">
            69 Stilton Avenue
          </h1>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Renovation Portal
          </span>
        </div>
        <VersionSelector />
      </div>
    </header>
  );
}
