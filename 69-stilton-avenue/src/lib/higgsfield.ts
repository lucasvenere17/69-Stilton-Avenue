const HIGGSFIELD_API_URL = "https://api.higgsfield.ai/v1";

export async function generateImage(
  imageBase64: string,
  prompt: string,
  options: { width?: number; height?: number } = {}
) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    throw new Error("Higgsfield API key not configured. Set HIGGSFIELD_API_KEY in .env.local");
  }

  const response = await fetch(`${HIGGSFIELD_API_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      prompt,
      image: imageBase64,
      n: 1,
      size: `${options.width || 1024}x${options.height || 1024}`,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Higgsfield API error: ${response.status} - ${err}`);
  }

  return response.json();
}

export async function inpaintImage(
  imageBase64: string,
  maskBase64: string,
  prompt: string
) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    throw new Error("Higgsfield API key not configured. Set HIGGSFIELD_API_KEY in .env.local");
  }

  const response = await fetch(`${HIGGSFIELD_API_URL}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "banana-inpaint",
      image: imageBase64,
      mask: maskBase64,
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Higgsfield Inpaint API error: ${response.status} - ${err}`);
  }

  return response.json();
}
