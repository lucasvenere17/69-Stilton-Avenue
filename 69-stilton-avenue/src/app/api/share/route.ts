import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const scenarioId = req.nextUrl.searchParams.get("id");
  if (!scenarioId) {
    return NextResponse.json({ error: "Missing scenario id" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "src/data/scenarios",
    `${scenarioId}.json`
  );

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ scenario: JSON.parse(data) });
  } catch {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }
}
