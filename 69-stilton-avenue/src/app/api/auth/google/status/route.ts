import { NextResponse } from "next/server";
import { loadTokens, getConnectedEmail } from "@/lib/gmail";

export async function GET() {
  try {
    const tokens = loadTokens();
    if (!tokens) {
      return NextResponse.json({ connected: false });
    }

    const email = await getConnectedEmail();
    if (!email) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email,
    });
  } catch (err) {
    console.error("Gmail status check error:", err);
    return NextResponse.json({ connected: false });
  }
}
