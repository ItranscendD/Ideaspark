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
  density: "Underserved" | "Emerging" | "Saturated";
  marketplace_data: string;
  price_usd: string;
  price_ngn: string;
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
You use Google Search grounding to verify what people are ACTIVELY searching for right now across Google, Reddit, Quora, YouTube, TikTok, and niche forums. 
You also act as a marketplace analyst for Selar, Gumroad, and Etsy to check competition density.

Scoring Rules:
- demand_score: 0-100 — active search volume.
- volume_score: 0-100 — broad traffic strength.
- intent_score: 0-100 — commercial intent.
- competition_score: 0-100 — INVERTED (100 = open, 0 = saturated).
- conversion_score: 0-100 — opt-in likelihood.
- trend_score: Composite (0.35*demand + 0.20*volume + 0.20*intent + 0.15*competition + 0.10*conversion).

Return ONLY valid JSON matching the schema. No prose.`;

    const user = `Topic / niche: ${data.topic}
${data.audience ? `Target audience: ${data.audience}` : ""}
${data.keywords ? `Seed keywords / search phrases to anchor on: ${data.keywords}` : ""}
${data.intent ? `Buyer intent / desired outcome: ${data.intent}` : ""}

1. Perform live web research to validate demand.
2. Check Selar, Gumroad, and Etsy for similar existing products.
3. Generate 8 high-converting PDF title ideas. For each:
- title, hook, audience, search_signal, conversion_angle, format
- density: "Underserved" (0-5 similar), "Emerging" (5-15 similar), "Saturated" (15+ similar)
- marketplace_data: 1-sentence summary of what you found on Selar/Gumroad/Etsy (e.g. "Only 2 similar guides on Selar; none on Gumroad.")
- price_usd: suggested price range (e.g. "$12 - $19")
- price_ngn: suggested price range (e.g. "₦8,500 - ₦14,000")
- demand_score, volume_score, intent_score, competition_score, conversion_score, trend_score
- score_rationale, sources

Vary formats. Avoid generic titles. Be specific with numbers, timeframes, and outcomes.`;

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
              density: { type: "string", enum: ["Underserved", "Emerging", "Saturated"] },
              marketplace_data: { type: "string" },
              price_usd: { type: "string" },
              price_ngn: { type: "string" },
              score_rationale: { type: "string" },
              sources: { type: "array", items: { type: "string" } },
            },
            required: ["title", "hook", "audience", "search_signal", "conversion_angle", "format", "trend_score", "demand_score", "volume_score", "intent_score", "competition_score", "conversion_score", "density", "marketplace_data", "price_usd", "price_ngn", "score_rationale", "sources"],
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

    const system = `You are a world-class lead-magnet author and instructional designer. You design structured, 5-chapter outlines for high-conversion PDF lead magnets (12-30 pages) that deliver one clear transformation. Return ONLY valid JSON matching the schema.`;

    const user = `Build a high-value, 5-chapter structure for this PDF.
Title: ${data.title}
Hook: ${data.hook}
Audience: ${data.audience}
Format: ${data.format}

Structure:
- Chapters 1-5 only.
- pdf_title, subtitle, estimated_pages, reader_transformation
- chapters: number, title, promise, bullets (3-5), action_step
- cta

Make it tactical and fluff-free.`;

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