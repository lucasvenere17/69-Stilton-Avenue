import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    const result = await sendEmail(to, subject, emailBody);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to send email. Gmail may not be connected." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
