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
      body: JSON.stringify(sessionBody(request, body)),
    });
    if (!upstream.ok) return Response.json({ live: false });
    const data = (await upstream.json()) as { credentials?: unknown };
    if (!data.credentials) return Response.json({ live: false });
    return Response.json({ live: true, credentials: data.credentials });
  } catch {
    return Response.json({ live: false });
  }
}

function sessionBody(request: Request, body: { name?: string; hope?: string; portrait?: string }) {
  const seed = seedImageUrl(request);
  return {
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
    ...(seed ? { seed_image_url: seed } : {}),
    limits: { max_duration_ms: 180000 },
    credentials_ttl_ms: 240000,
  };
}

function seedImageUrl(request: Request): string | null {
  const origin = publicOrigin(request);
  return origin ? `${origin}/jesus-reference.jpg` : null;
}

function publicOrigin(request: Request): string {
  const render = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, "") ?? "";
  if (render) return render;
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = forwarded || request.headers.get("host") || "";
  if (!host || /localhost|127\.0\.0\.1/i.test(host)) return "";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}
