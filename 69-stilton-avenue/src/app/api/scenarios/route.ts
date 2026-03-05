import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SCENARIOS_DIR = path.join(process.cwd(), "src/data/scenarios");

async function ensureDir() {
  await fs.mkdir(SCENARIOS_DIR, { recursive: true });
}

export async function GET() {
  await ensureDir();
  const files = await fs.readdir(SCENARIOS_DIR);
  const scenarios = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const data = await fs.readFile(path.join(SCENARIOS_DIR, f), "utf-8");
        return JSON.parse(data);
      })
  );
  return NextResponse.json({ scenarios });
}

export async function POST(req: NextRequest) {
  await ensureDir();
  const scenario = await req.json();
  await fs.writeFile(
    path.join(SCENARIOS_DIR, `${scenario.id}.json`),
    JSON.stringify(scenario, null, 2)
  );
  return NextResponse.json({ success: true, id: scenario.id });
}

export async function PUT(req: NextRequest) {
  await ensureDir();
  const scenario = await req.json();
  const filePath = path.join(SCENARIOS_DIR, `${scenario.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(scenario, null, 2));
  return NextResponse.json({ success: true });
}
