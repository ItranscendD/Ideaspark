import { createServerFn } from "@tanstack/react-start";

export type TitleIdea = {
  title: string;
  hook: string;
  audience: string;
  search_signal: string;
  conversion_angle: string;
  format: string;
  trend_score: number;
  demand_score: number;
  volume_score: number;
  intent_score: number;
  competition_score: number;
  conversion_score: number;
  score_rationale: string;
  sources: string[];
};

export const generateTitles = createServerFn({ method: "POST" })
  .inputValidator((data: { topic: string; audience?: string; keywords?: string; intent?: string }) => {
    if (!data?.topic || typeof data.topic !== "string") throw new Error("topic required");
    return {
      topic: data.topic.slice(0, 300),
      audience: (data.audience ?? "").slice(0, 200),
      keywords: (data.keywords ?? "").slice(0, 300),
      intent: (data.intent ?? "").slice(0, 200),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are a world-class lead-magnet strategist + senior SEO/demand researcher.
You use Google Search grounding to verify what people are ACTIVELY searching for right now across Google, Reddit, Quora, YouTube, TikTok, and niche forums. Cite specific source domains/URLs you used.
You craft PDF lead-magnet titles that convert at 40%+ opt-in.

Scoring Rules:
- demand_score: 0-100 — how many people are actively searching/asking this right now.
- volume_score: 0-100 — search volume strength (is it a broad high-traffic term or a niche long-tail?).
- intent_score: 0-100 — buyer intent signal (are they looking for a solution to pay for, or just browsing?).
- competition_score: 0-100 — INVERTED (100 = wide-open/low-comp, 0 = saturated/high-comp).
- conversion_score: 0-100 — likelihood a cold visitor trades email for this exact title.
- trend_score: Composite (0.35*demand + 0.20*volume + 0.20*intent + 0.15*competition + 0.10*conversion).

Be conservative. Most ideas score 40-75. Only truly hot, low-comp, high-intent ideas score 85+.
Return ONLY valid JSON matching the schema. No prose.`;

    const user = `Topic / niche: ${data.topic}
${data.audience ? `Target audience: ${data.audience}` : ""}
${data.keywords ? `Seed keywords / search phrases to anchor on: ${data.keywords}` : ""}
${data.intent ? `Buyer intent / desired outcome: ${data.intent}` : ""}

Use live web research to validate demand before suggesting. Generate 8 high-converting PDF lead-magnet title ideas tailored to the audience. For each:
- title: punchy, specific, benefit-driven, under 70 chars
- hook: one-line promise that makes someone trade their email
- audience: who specifically clicks this (be specific to the target audience provided)
- search_signal: the actual question/phrase people are typing into Google/Reddit/YouTube right now (verbatim query in quotes)
- conversion_angle: WHY this converts (urgency, status, fear, curiosity gap, contrarian, etc.)
- format: "Checklist" | "Cheatsheet" | "Template" | "Swipe File" | "Playbook" | "Mini-Guide" | "Toolkit" | "Script"
- demand_score, volume_score, intent_score, competition_score, conversion_score, trend_score: numbers 0-100 (see system prompt)
- score_rationale: 1-sentence justification grounded in volume and intent signals found
- sources: 2-4 short citations (domain or URL) that informed the demand read

Vary formats. Avoid generic titles like "Ultimate Guide to X". Be specific with numbers, timeframes, and outcomes.`;

    const schema = {
      type: "object",
      properties: {
        ideas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              hook: { type: "string" },
              audience: { type: "string" },
              search_signal: { type: "string" },
              conversion_angle: { type: "string" },
              format: { type: "string" },
              trend_score: { type: "number" },
              demand_score: { type: "number" },
              volume_score: { type: "number" },
              intent_score: { type: "number" },
              competition_score: { type: "number" },
              conversion_score: { type: "number" },
              score_rationale: { type: "string" },
              sources: { type: "array", items: { type: "string" } },
            },
            required: ["title", "hook", "audience", "search_signal", "conversion_angle", "format", "trend_score", "demand_score", "volume_score", "intent_score", "competition_score", "conversion_score", "score_rationale", "sources"],
          },
        },
      },
      required: ["ideas"],
    };


    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_ideas",
              description: "Return PDF title ideas",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_ideas" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Settings.");
      throw new Error(`AI gateway error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No response from AI");
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return { ideas: parsed.ideas as TitleIdea[] };
  });

export type OutlineChapter = {
  number: number;
  title: string;
  promise: string;
  bullets: string[];
  action_step: string;
};

export type Outline = {
  pdf_title: string;
  subtitle: string;
  estimated_pages: number;
  reader_transformation: string;
  chapters: OutlineChapter[];
  cta: string;
};

export const generateOutline = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; hook?: string; audience?: string; format?: string; angle?: string }) => {
    if (!data?.title || typeof data.title !== "string") throw new Error("title required");
    return {
      title: data.title.slice(0, 300),
      hook: (data.hook ?? "").slice(0, 300),
      audience: (data.audience ?? "").slice(0, 200),
      format: (data.format ?? "").slice(0, 60),
      angle: (data.angle ?? "").slice(0, 300),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are a world-class lead-magnet author and instructional designer. You design chapter outlines for short, high-conversion PDF lead magnets (12-30 pages) that deliver one clear transformation. No fluff. Every chapter moves the reader closer to the promised outcome. Return ONLY valid JSON matching the schema.`;

    const user = `Build a chapter outline for this PDF lead magnet.

Title: ${data.title}
${data.hook ? `Hook: ${data.hook}` : ""}
${data.audience ? `Audience: ${data.audience}` : ""}
${data.format ? `Format: ${data.format}` : ""}
${data.angle ? `Conversion angle: ${data.angle}` : ""}

Return:
- pdf_title: final title (refine slightly if needed)
- subtitle: one-line subtitle reinforcing the promise
- estimated_pages: realistic total (12-30)
- reader_transformation: one sentence: BEFORE -> AFTER
- chapters: 5-8 chapters. Each: number, title (punchy), promise (what they can do after), bullets (3-5 concrete sub-points), action_step (one tactical do-this-now task)
- cta: closing call-to-action bridging to a paid offer or next step

Be specific. Use numbers, frameworks, and tactics over abstract advice.`;

    const schema = {
      type: "object",
      properties: {
        pdf_title: { type: "string" },
        subtitle: { type: "string" },
        estimated_pages: { type: "number" },
        reader_transformation: { type: "string" },
        chapters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              number: { type: "number" },
              title: { type: "string" },
              promise: { type: "string" },
              bullets: { type: "array", items: { type: "string" } },
              action_step: { type: "string" },
            },
            required: ["number", "title", "promise", "bullets", "action_step"],
          },
        },
        cta: { type: "string" },
      },
      required: ["pdf_title", "subtitle", "estimated_pages", "reader_transformation", "chapters", "cta"],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: { name: "return_outline", description: "Return chapter outline", parameters: schema },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_outline" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Settings.");
      throw new Error(`AI gateway error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No response from AI");
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed as Outline;
  });