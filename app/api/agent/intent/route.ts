import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseIntent } from "@/lib/ap2/parseIntent";
import { parseIntentWithLLM } from "@/lib/ap2/llmIntent";
import { signPayload } from "@/lib/ap2/sign";
import { USER_AGENT_PRIVATE_KEY_PEM, USER_AGENT_PUBLIC_KEY_PEM } from "@/lib/ap2/demo-keys";
import { IntentMandate } from "@/lib/ap2/types";

const INTENT_TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { message, userId } = await req.json();

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const llmConstraints = await parseIntentWithLLM(message);
  const constraints = llmConstraints ?? parseIntent(message);

  const now = new Date();
  const mandate: IntentMandate = {
    type: "IntentMandate",
    id: randomUUID(),
    userId: typeof userId === "string" && userId ? userId : "demo-user",
    naturalLanguageDescription: message.trim(),
    constraints,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INTENT_TTL_MS).toISOString(),
    parsedBy: llmConstraints ? "llm" : "rule-based",
  };

  const envelope = signPayload(mandate, USER_AGENT_PRIVATE_KEY_PEM, USER_AGENT_PUBLIC_KEY_PEM);

  return NextResponse.json(envelope);
}
