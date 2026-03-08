import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src/data/budgets.json");

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { renovation: [], furniture: [] };
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
  const { budgetType } = body.item;

  if (budgetType === "renovation") {
    data.renovation.push(body.item);
  } else {
    data.furniture.push(body.item);
  }

  await writeData(data);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  if (body.type === "bulk") {
    // Bulk update - replace entire dataset
    data.renovation = body.renovation || data.renovation;
    data.furniture = body.furniture || data.furniture;
  } else {
    const { budgetType } = body.item;
    if (budgetType === "renovation") {
      data.renovation = data.renovation.map((item: Record<string, unknown>) =>
        item.id === body.item.id ? body.item : item
      );
    } else {
      data.furniture = data.furniture.map((item: Record<string, unknown>) =>
        item.id === body.item.id ? body.item : item
      );
    }
  }

  await writeData(data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  data.renovation = data.renovation.filter(
    (item: Record<string, unknown>) => item.id !== body.id
  );
  data.furniture = data.furniture.filter(
    (item: Record<string, unknown>) => item.id !== body.id
  );

  await writeData(data);
  return NextResponse.json({ success: true });
}
