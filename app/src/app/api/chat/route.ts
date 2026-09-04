import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { buildSystemPrompt } from "@/lib/chat-context";
import type { Crm } from "@/lib/crm";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

type ChatMessage = { role: "user" | "assistant"; content: string };

let contextCache: string | null = null;

async function systemPrompt(): Promise<string> {
  if (contextCache) return contextCache;
  const raw = await readFile(
    join(process.cwd(), "public", "data", "crm.json"),
    "utf-8",
  );
  const crm = JSON.parse(raw) as Crm;
  contextCache = buildSystemPrompt(crm.meta, crm.kpis);
  return contextCache;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Chat is not configured - OPENROUTER_API_KEY is missing." },
      { status: 503 },
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = (body.messages ?? [])
      .filter(
        (m: ChatMessage) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-8);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Send a user message." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Sixt CRM Dashboard",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || FALLBACK_MODEL,
        temperature: 0.1,
        max_tokens: 400,
        messages: [
          { role: "system", content: await systemPrompt() },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return Response.json(
        { error: `The model request failed (${res.status}).`, detail },
        { status: 502 },
      );
    }

    const data = await res.json();
    const reply: string | undefined = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return Response.json(
        { error: "The model returned an empty response." },
        { status: 502 },
      );
    }
    return Response.json({ reply });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json(
      { error: aborted ? "The model timed out." : "Could not reach the model." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
