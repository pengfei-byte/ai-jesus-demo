import { CRISIS_PORTRAIT, CRISIS_REPLY, isCrisis } from "@/lib/crisis";
import type { Exchange } from "@/lib/memory";
import { FALLBACK, systemPrompt, type RoomMode } from "@/lib/persona";
import { allow, clientIp } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

type ReplyBody = {
  mode?: RoomMode;
  message?: string;
  name?: string;
  hope?: string;
  portrait?: string;
  recent?: Exchange[];
};

function isRoom(mode: string | undefined): mode is RoomMode {
  return mode === "confess" || mode === "pray" || mode === "talk";
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as ReplyBody;
  const mode: RoomMode = isRoom(body.mode) ? body.mode : "talk";
  const message = body.message ?? "";
  const portrait = body.portrait ?? "";

  if (isCrisis(message)) {
    return Response.json({ reply: CRISIS_REPLY, portrait: CRISIS_PORTRAIT, source: "crisis" });
  }

  if (!allow(`reply:${clientIp(request)}`, 30, HOUR, Date.now())) {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "limited" }, { status: 429 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
  }

  try {
    const recent = (body.recent ?? [])
      .map((item) => `${item.mode} | user: ${item.user} | jesus: ${item.jesus}`)
      .join("\n");
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(mode) },
          {
            role: "user",
            content: `Name: ${body.name ?? ""}\nHope: ${body.hope ?? ""}\nPortrait: ${portrait}\nRecent:\n${recent}\nThey say: ${message}`,
          },
        ],
      }),
    });
    if (!upstream.ok) {
      return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
    }
    const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseModel(content, portrait);
    return Response.json({ reply: parsed.reply, portrait: parsed.portrait, source: "model" });
  } catch {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
  }
}

function parseModel(content: string, previousPortrait: string): { reply: string; portrait: string } {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const parsed = JSON.parse(content.slice(start, end + 1)) as { reply?: unknown; portrait?: unknown };
    return {
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : content,
      portrait: typeof parsed.portrait === "string" ? parsed.portrait : previousPortrait,
    };
  } catch {
    return { reply: content, portrait: previousPortrait };
  }
}
