import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { generateTitles, generateOutline, type TitleIdea, type Outline } from "@/lib/titles.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, TrendingUp, Target, Zap, Loader2, FileText, Copy, Check, Link2, Flame, BookOpen, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TitleForge — High-Converting PDF Title Ideas, Grounded in Real Search Demand" },
      {
        name: "description",
        content:
          "Generate PDF lead-magnet titles people actually search for. AI-powered, demand-driven, conversion-tested.",
      },
    ],
  }),
});

function Index() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [intent, setIntent] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [outlineFor, setOutlineFor] = useState<TitleIdea | null>(null);
  const fn = useServerFn(generateTitles);
  const outlineFn = useServerFn(generateOutline);

  const mutation = useMutation({
    mutationFn: (input: { topic: string; audience: string; keywords: string; intent: string }) =>
      fn({ data: input }),
  });

  const outlineMutation = useMutation({
    mutationFn: (idea: TitleIdea) =>
      outlineFn({
        data: {
          title: idea.title,
          hook: idea.hook,
          audience: idea.audience,
          format: idea.format,
          angle: idea.conversion_angle,
        },
      }),
  });

  const openOutline = (idea: TitleIdea) => {
    setOutlineFor(idea);
    outlineMutation.reset();
    outlineMutation.mutate(idea);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    mutation.mutate({ topic, audience, keywords, intent });
  };

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--grad-hero)" }}
      >
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: "var(--grad-accent)" }}
            >
              <FileText className="h-4 w-4 text-background" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">TitleForge</span>
          </div>
          <span className="text-xs text-muted-foreground">Powered by demand signals</span>
        </header>

        <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center md:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            Built for creators, marketers & coaches
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            PDF titles people are{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--grad-accent)" }}
            >
              actively searching for.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            Drop in your niche. Get 8 high-converting lead-magnet titles grounded in real demand —
            with the search query, audience, and conversion angle behind each one.
          </p>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-2xl"
          >
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Your niche or topic (e.g. 'fitness for busy dads')"
              className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:text-lg"
              required
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Audience (optional) — e.g. 'first-time founders'"
                className="border-0 bg-secondary/50 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Keywords (optional) — e.g. 'meal prep, fat loss'"
                className="border-0 bg-secondary/50 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Input
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Buyer intent (optional) — e.g. 'lose 10lbs in 30 days'"
                className="border-0 bg-secondary/50 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring sm:col-span-2"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={mutation.isPending || !topic.trim()}
                className="h-11 shrink-0 font-semibold text-primary-foreground"
                style={{ background: "var(--grad-accent)" }}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Forging…
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Titles
                  </>
                )}
              </Button>
            </div>
          </form>

          {mutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {(mutation.error as Error).message}
            </p>
          )}
        </section>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {mutation.data?.ideas && (
          <div className="grid gap-4 md:grid-cols-2">
            {[...mutation.data.ideas]
              .sort((a, b) => (b.trend_score ?? 0) - (a.trend_score ?? 0))
              .map((idea: TitleIdea, i: number) => (
              <article
                key={i}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {idea.format}
                    </span>
                    <TrendBadge score={idea.trend_score} />
                  </div>
                  <button
                    onClick={() => copy(idea.title, i)}
                    className="text-muted-foreground transition hover:text-primary"
                    aria-label="Copy title"
                  >
                    {copied === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <h3 className="text-xl font-bold leading-tight tracking-tight">{idea.title}</h3>
                <p className="text-sm italic text-muted-foreground">"{idea.hook}"</p>
                <ScoreBars
                  demand={idea.demand_score}
                  competition={idea.competition_score}
                  conversion={idea.conversion_score}
                  rationale={idea.score_rationale}
                />
                <div className="mt-auto space-y-2 border-t border-border pt-4 text-xs">
                  <Row icon={<Target className="h-3.5 w-3.5" />} label="Audience" value={idea.audience} />
                  <Row
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label="Search signal"
                    value={idea.search_signal}
                  />
                  <Row
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label="Why it converts"
                    value={idea.conversion_angle}
                  />
                  {idea.sources?.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      <span className="mt-0.5 text-primary"><Link2 className="h-3.5 w-3.5" /></span>
                      <div className="flex-1">
                        <span className="font-semibold text-foreground">Sources: </span>
                        <span className="text-muted-foreground">
                          {idea.sources.map((s, j) => {
                            const url = s.startsWith("http") ? s : `https://${s.replace(/^\/+/, "")}`;
                            return (
                              <a
                                key={j}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mr-2 underline decoration-dotted underline-offset-2 hover:text-primary"
                              >
                                {s}
                              </a>
                            );
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => openOutline(idea)}
                  variant="outline"
                  className="mt-2 w-full justify-between border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Build chapter outline
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Button>
              </article>
            ))}
          </div>
        )}

        {!mutation.data && !mutation.isPending && (
          <div className="grid gap-6 rounded-2xl border border-border bg-card/50 p-8 md:grid-cols-3">
            <Feature
              icon={<TrendingUp className="h-5 w-5" />}
              title="Demand-grounded"
              text="Each title maps to what people actually search on Google, Reddit & YouTube."
            />
            <Feature
              icon={<Target className="h-5 w-5" />}
              title="Audience-specific"
              text="No generic fluff. Titles speak to a clear who and a clear pain."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Conversion logic"
              text="See why each idea converts — urgency, status, curiosity, contrarian."
            />
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Forge titles that actually get downloaded.
      </footer>

      <OutlineDialog
        idea={outlineFor}
        onClose={() => setOutlineFor(null)}
        outline={outlineMutation.data}
        isLoading={outlineMutation.isPending}
        error={outlineMutation.error as Error | null}
      />
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="flex-1">
        <span className="font-semibold text-foreground">{label}: </span>
        <span className="text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TrendBadge({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const tone =
    s >= 80
      ? "bg-primary/15 text-primary border-primary/30"
      : s >= 60
      ? "bg-accent/15 text-accent border-accent/30"
      : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}
      title="Composite trend score (demand + low-competition + conversion)"
    >
      <Flame className="h-3 w-3" />
      {s}
    </span>
  );
}

function ScoreBars({
  demand,
  competition,
  conversion,
  rationale,
}: {
  demand: number;
  competition: number;
  conversion: number;
  rationale: string;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-3">
      <Bar label="Demand" value={demand} />
      <Bar label="Low comp." value={competition} />
      <Bar label="Conversion" value={conversion} />
      {rationale && <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{rationale}</p>}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full"
          style={{ width: `${v}%`, background: "var(--grad-accent)" }}
        />
      </div>
      <span className="w-7 text-right font-semibold tabular-nums">{v}</span>
    </div>
  );
}

function OutlineDialog({
  idea,
  onClose,
  outline,
  isLoading,
  error,
}: {
  idea: TitleIdea | null;
  onClose: () => void;
  outline: Outline | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const open = !!idea;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <BookOpen className="h-5 w-5 text-primary" />
            Chapter outline
          </DialogTitle>
          {idea && (
            <DialogDescription className="text-left">
              For: <span className="font-medium text-foreground">{idea.title}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Forging chapters from the demand signal…</p>
          </div>
        )}

        {error && !isLoading && (
          <p className="py-6 text-sm text-destructive">{error.message}</p>
        )}

        {outline && !isLoading && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <h3 className="text-lg font-bold leading-tight">{outline.pdf_title}</h3>
              <p className="mt-1 text-sm italic text-muted-foreground">{outline.subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full bg-background px-2.5 py-1 font-semibold text-primary">
                  ~{outline.estimated_pages} pages
                </span>
                <span className="text-muted-foreground">{outline.reader_transformation}</span>
              </div>
            </div>

            <ol className="space-y-3">
              {outline.chapters.map((c) => (
                <li
                  key={c.number}
                  className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-background"
                      style={{ background: "var(--grad-accent)" }}
                    >
                      {c.number}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold leading-snug">{c.title}</h4>
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{c.promise}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 pl-10 text-sm">
                    {c.bullets.map((b, i) => (
                      <li key={i} className="list-disc text-muted-foreground marker:text-primary">
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 ml-10 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                    <span className="font-semibold text-primary">Action: </span>
                    <span className="text-foreground">{c.action_step}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-primary/30 p-4" style={{ background: "var(--grad-hero)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Closing CTA</div>
              <p className="mt-1 text-sm">{outline.cta}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
