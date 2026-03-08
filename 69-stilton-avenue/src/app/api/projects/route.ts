import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src/data/projects.json");

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { projects: [], contractors: [] };
  }
}

async function writeData(data: Record<string, unknown>) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  const data = await readData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  if (body.type === "contractor") {
    data.contractors.push(body.contractor);
  } else {
    data.projects.push(body.project);
  }

  await writeData(data);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  if (body.type === "contractor") {
    data.contractors = data.contractors.map((c: Record<string, unknown>) =>
      c.id === body.contractor.id ? body.contractor : c
    );
  } else {
    data.projects = data.projects.map((p: Record<string, unknown>) =>
      p.id === body.project.id ? body.project : p
    );
  }

  await writeData(data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  if (body.type === "contractor") {
    data.contractors = data.contractors.filter(
      (c: Record<string, unknown>) => c.id !== body.id
    );
  } else {
    data.projects = data.projects.filter(
      (p: Record<string, unknown>) => p.id !== body.id
    );
  }

  await writeData(data);
  return NextResponse.json({ success: true });
}
