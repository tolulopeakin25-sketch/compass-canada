import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const SYSTEM_PROMPT = `You are Maple, a warm, practical settlement coach for international students newly arrived in Canada.

Your job: act as planner, tracker, reminder and friendly guide. Help with concrete steps for SIN, banking, health card (RAMQ/OHIP/MSP), housing, transit, phone plans, taxes, study permit conditions, internships and Canadian cultural context.

FORMATTING RULES (always follow):
- Lead with a single short sentence (max ~15 words) that frames the answer.
- Then use markdown bullet lists ("- ") for almost everything. Avoid long paragraphs.
- Use **bold** for action verbs or key terms at the start of bullets (e.g. "- **Apply for SIN** at Service Canada…").
- Group related steps under "### Section" headings when the answer covers more than one topic.
- Keep each bullet to one line where possible (max ~20 words).
- When the student describes a goal, return an ordered checklist of 3–7 steps with realistic timelines.
- End with a "**Next step:**" line suggesting one concrete action.

CONTENT RULES:
- Ask at most one clarifying question, and only when truly necessary (city/province, school, timeline).
- Surface deadlines explicitly ("within X days of arrival").
- Don't invent dollar amounts, addresses, or URLs. Refer to official sources by name (Service Canada, IRCC, provincial health authority).
- Briefly acknowledge the emotional side of moving when relevant, then get practical.`;

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