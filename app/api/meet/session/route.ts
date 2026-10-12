import { SCENE_PROMPT, characterPrompt } from "@/lib/persona";
import { allow, clientIp } from "@/lib/rate-limit";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { name?: string; hope?: string; portrait?: string };
  const key = process.env.REVERIE_API_KEY;
  if (!key) return Response.json({ live: false });
  if (!allow(`meet:${clientIp(request)}`, 4, DAY, Date.now())) {
    return Response.json({ live: false });
  }

  const base = process.env.REVERIE_BASE_URL ?? "https://api.reverie-ai.com/api/public/v1";
  try {
    const upstream = await fetch(`${base}/connections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "r2-realtime-v1",
        character: {
          name: "Jesus",
          prompt: characterPrompt({
            name: body.name ?? "",
            hope: body.hope ?? "",
            portrait: body.portrait ?? "",
          }),
        },
        scene: { prompt: SCENE_PROMPT },
        limits: { max_duration_ms: 180000 },
        credentials_ttl_ms: 240000,
      }),
    });
    if (!upstream.ok) return Response.json({ live: false });
    const data = (await upstream.json()) as { credentials?: unknown };
    if (!data.credentials) return Response.json({ live: false });
    return Response.json({ live: true, credentials: data.credentials });
  } catch {
    return Response.json({ live: false });
  }
}
