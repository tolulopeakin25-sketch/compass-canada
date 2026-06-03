import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const SYSTEM_PROMPT = `You are Maple, a warm, practical settlement coach for international students newly arrived in Canada.

Your job: act as planner, tracker, reminder and friendly guide. Help with concrete steps for things like SIN, banking, health card (RAMQ/OHIP/MSP), housing, transit, phone plans, taxes, study permit conditions, internships and Canadian cultural context.

Style rules:
- Be concise. Use short paragraphs and tight bullet lists.
- When the student describes a goal, break it into a small ordered checklist (3-6 steps max) with realistic timelines.
- Ask one clarifying question only when truly needed (city/province, school, timeline).
- Surface deadlines and reminders explicitly ("Do this within X days of arrival").
- Never invent specific dollar amounts, addresses, or government URLs. Point to official sources by name (e.g. "Service Canada", "IRCC").
- Acknowledge the emotional side of moving briefly when relevant, then get practical.`;

export const chatWithMaple = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messages: z.array(MessageSchema).min(1).max(50),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        return { error: "Maple is getting a lot of questions right now. Try again in a moment." };
      }
      if (res.status === 402) {
        return { error: "AI credits exhausted. Please top up your Lovable workspace." };
      }
      console.error("AI gateway error", res.status, text);
      return { error: "Something went wrong reaching the assistant." };
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "";
    return { reply };
  });