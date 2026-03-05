import { NextRequest, NextResponse } from "next/server";
import { generateImage, inpaintImage } from "@/lib/higgsfield";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, prompt, scenarioId, mask, mode } = body;

    if (!imageBase64 || !prompt) {
      return NextResponse.json(
        { error: "imageBase64 and prompt are required" },
        { status: 400 }
      );
    }

    let result;
    if (mode === "inpaint" && mask) {
      result = await inpaintImage(imageBase64, mask, prompt);
    } else {
      result = await generateImage(imageBase64, prompt);
    }

    // Save the result if scenarioId provided
    if (scenarioId && result.data?.[0]?.b64_json) {
      const outputDir = path.join(
        process.cwd(),
        "public/assets/ai-generated",
        scenarioId
      );
      await fs.mkdir(outputDir, { recursive: true });
      const filename = `edit-${Date.now()}.png`;
      const buffer = Buffer.from(result.data[0].b64_json, "base64");
      await fs.writeFile(path.join(outputDir, filename), buffer);
      return NextResponse.json({
        success: true,
        imageUrl: `/assets/ai-generated/${scenarioId}/${filename}`,
        data: result.data,
      });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
