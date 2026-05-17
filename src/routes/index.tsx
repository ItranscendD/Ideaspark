import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  generateTitles,
  generateOutline,
  generateSalesCopy,
  type TitleIdea,
  type Outline,
  type SalesCopy,
  type SocialPost,
} from "@/lib/titles.functions";
import { FREE_GENERATION_LIMIT } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  Loader2,
  FileText,
  Copy,
  Check,
  Link2,
  Flame,
  BookOpen,
  ArrowRight,
  Lock,
  Crown,
  CheckCircle2,
  X,
  Search,
  Users,
  SortAsc,
  Filter,
  BarChart3,
  MousePointerClick,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  MapPin,
  Globe,
  Plus,
  Trash2,
  Rocket,
  Clock,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

// ── Vault Types ─────────────────────────────────────────────────────────────
export type VaultStatus = "Saved" | "In Progress" | "Published";

export type VaultIdea = {
  id: string;
  idea: TitleIdea;
  status: VaultStatus;
  savedAt: number;
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const AUDIENCE_PRESETS = [
  "Nigerian Moms",
  "Remote Freelancers",
  "Church Pastors",
  "Tech Founders",
  "Real Estate Agents",
  "First-time Homebuyers",
];

// ── localStorage keys ──────────────────────────────────────────────────────
const LS_GEN_COUNT = "tf_gen_count";
const LS_SUBSCRIBED = "tf_subscribed";
const LS_EMAIL = "tf_email";
const LS_VAULT = "tf_vault";

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

// ── Vault state helpers ────────────────────────────────────────────────────
function getVault(): VaultIdea[] {
  try {
    return JSON.parse(localStorage.getItem(LS_VAULT) ?? "[]");
  } catch {
    return [];
  }
}
function saveVault(v: VaultIdea[]) {
  try {
    localStorage.setItem(LS_VAULT, JSON.stringify(v));
  } catch {
    /* SSR */
  }
}

// ── Subscription state helpers ─────────────────────────────────────────────
function getGenCount(): number {
  try {
    return parseInt(localStorage.getItem(LS_GEN_COUNT) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}
function isSubscribed(): boolean {
  try {
    return localStorage.getItem(LS_SUBSCRIBED) === "true";
  } catch {
    return false;
  }
}
function incrementGenCount() {
  try {
    localStorage.setItem(LS_GEN_COUNT, String(getGenCount() + 1));
  } catch {
    /* SSR */
  }
}

// ── Main component ─────────────────────────────────────────────────────────
function Index() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [intent, setIntent] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [outlineFor, setOutlineFor] = useState<TitleIdea | null>(null);

  // Sorting and Filtering
  const [sortBy, setSortBy] = useState<"trend" | "demand" | "volume" | "intent" | "comp" | "conv">(
    "trend",
  );
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterAudience, setFilterAudience] = useState("All");

  // Vault State
  const [vault, setVault] = useState<VaultIdea[]>([]);
  const [showVault, setShowVault] = useState(false);

  // Sales Copy State
  const [salesCopyFor, setSalesCopyFor] = useState<TitleIdea | null>(null);

  useEffect(() => {
    setVault(getVault());
  }, []);

  const saveToVault = (idea: TitleIdea) => {
    const newVault = [
      {
        id: Math.random().toString(36).substring(7),
        idea,
        status: "Saved" as VaultStatus,
        savedAt: Date.now(),
      },
      ...vault,
    ];
    setVault(newVault);
    saveVault(newVault);
  };

  const updateVaultStatus = (id: string, status: VaultStatus) => {
    const newVault = vault.map((v) => (v.id === id ? { ...v, status } : v));
    setVault(newVault);
    saveVault(newVault);
  };

  const removeFromVault = (id: string) => {
    const newVault = vault.filter((v) => v.id !== id);
    setVault(newVault);
    saveVault(newVault);
  };

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallEmail, setPaywallEmail] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const fn = useServerFn(generateTitles);
  const outlineFn = useServerFn(generateOutline);

  // ── On mount: restore subscription state & handle payment return ──────────
  useEffect(() => {
    setSubscribed(isSubscribed());

    // Restore saved email
    try {
      const saved = localStorage.getItem(LS_EMAIL);
      if (saved) setPaywallEmail(saved);
    } catch {
      /* ignore */
    }

    // Handle Paystack redirect back: ?payment=success&reference=xxx
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const reference = params.get("reference");
      if (reference) {
        // Verify with our backend before granting access
        fetch(`/api/payment/verify?reference=${encodeURIComponent(reference)}`)
          .then((r) => r.json())
          .then((data: { verified?: boolean }) => {
            if (data.verified) {
              localStorage.setItem(LS_SUBSCRIBED, "true");
              setSubscribed(true);
              setJustPaid(true);
            }
          })
          .catch(console.error)
          .finally(() => {
            // Clean up query params from URL
            window.history.replaceState({}, "", window.location.pathname);
          });
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // ── Generation mutations ───────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (input: { topic: string; audience: string; keywords: string; intent: string }) =>
      fn({ data: input }),
    onSuccess: () => {
      incrementGenCount();
    },
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

  const salesCopyMutation = useMutation({
    mutationFn: (idea: TitleIdea) =>
      generateSalesCopy({
        data: {
          title: idea.title,
          hook: idea.hook,
          audience: idea.audience,
          price: idea.price_usd,
        },
      }),
  });

  const openSalesCopy = (idea: TitleIdea) => {
    setSalesCopyFor(idea);
    salesCopyMutation.reset();
    salesCopyMutation.mutate(idea);
  };

  // ── Submit with paywall gate ───────────────────────────────────────────────
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const genCount = getGenCount();
    if (!isSubscribed() && genCount >= FREE_GENERATION_LIMIT) {
      // Trigger the paywall modal
      setShowPaywall(true);
      return;
    }

    mutation.mutate({ topic, audience, keywords, intent });
  };

  // ── Paystack payment flow ─────────────────────────────────────────────────
  const handleUpgrade = useCallback(async () => {
    if (!paywallEmail || !paywallEmail.includes("@")) {
      setPaymentError("Please enter a valid email address");
      return;
    }

    try {
      localStorage.setItem(LS_EMAIL, paywallEmail);
    } catch {
      /* ignore */
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: paywallEmail }),
      });

      const data = (await res.json()) as { paymentUrl?: string; error?: string };

      if (!res.ok || !data.paymentUrl) {
        throw new Error(data.error ?? "Could not create payment session");
      }

      // Redirect user to Paystack hosted checkout
      window.location.href = data.paymentUrl;
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaymentLoading(false);
    }
  }, [paywallEmail]);

  const handleRestore = useCallback(async () => {
    if (!paywallEmail || !paywallEmail.includes("@")) {
      setPaymentError("Enter your subscription email to restore access");
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const res = await fetch("/api/payment/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: paywallEmail }),
      });

      const data = (await res.json()) as { subscribed: boolean; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Restore check failed");

      if (data.subscribed) {
        localStorage.setItem(LS_SUBSCRIBED, "true");
        localStorage.setItem(LS_EMAIL, paywallEmail);
        setJustPaid(true);
        setShowPaywall(false);
      } else {
        setPaymentError("No active subscription found for this email");
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setPaymentLoading(false);
    }
  }, [paywallEmail]);

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  // ── Derived Data for Results ──────────────────────────────────────────────
  const rawIdeas = mutation.data?.ideas ?? [];

  // Get unique formats and audiences for filters
  const formats = ["All", ...Array.from(new Set(rawIdeas.map((i) => i.format)))];
  const audiences = ["All", ...Array.from(new Set(rawIdeas.map((i) => i.audience)))];

  // Apply filtering and sorting
  const filteredIdeas = [...rawIdeas]
    .filter((idea) => filterFormat === "All" || idea.format === filterFormat)
    .filter((idea) => filterAudience === "All" || idea.audience === filterAudience)
    .sort((a, b) => {
      switch (sortBy) {
        case "demand":
          return b.demand_score - a.demand_score;
        case "volume":
          return b.volume_score - a.volume_score;
        case "intent":
          return b.intent_score - a.intent_score;
        case "comp":
          return b.competition_score - a.competition_score;
        case "conv":
          return b.conversion_score - a.conversion_score;
        default:
          return b.trend_score - a.trend_score;
      }
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {justPaid && (
        <div className="flex items-center justify-center gap-2 bg-primary py-2 text-center text-xs font-bold text-primary-foreground animate-in fade-in slide-in-from-top-4 duration-500">
          <CheckCircle2 className="h-4 w-4" />
          Upgrade Successful! You now have unlimited access to TitleForge Pro.
          <button onClick={() => setJustPaid(false)} className="ml-4 opacity-70 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="relative overflow-hidden" style={{ backgroundImage: "var(--grad-hero)" }}>
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: "var(--grad-accent)" }}
            >
              <FileText className="h-4 w-4 text-background" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">TitleForge</span>
              {subscribed && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <Crown className="h-2.5 w-2.5" />
                  Pro Member
                </span>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1">
            <button
              onClick={() => setShowVault(false)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${!showVault ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Zap className="h-3.5 w-3.5" />
              Discover
            </button>
            <button
              onClick={() => setShowVault(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${showVault ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              My Vault
              {vault.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
                  {vault.length}
                </span>
              )}
            </button>
          </nav>
        </header>

        <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center md:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Built for creators, marketers & coaches
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-foreground md:text-7xl">
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

          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 text-left shadow-premium"
            >
              <div className="flex flex-col gap-4 p-2">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Your niche or topic (e.g. 'fitness for busy dads')"
                    className="h-auto border-0 bg-transparent p-0 text-lg font-medium shadow-none focus-visible:ring-0 md:text-xl"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Target Audience
                    </div>
                    <Input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g. Nigerian moms, pastors..."
                      className="h-10 border-border bg-secondary/30 text-sm focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Keywords (optional)
                    </div>
                    <Input
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. meal prep, fat loss"
                      className="h-10 border-border bg-secondary/30 text-sm focus-visible:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Target className="h-3 w-3" />
                    Buyer Intent / Desired Outcome (optional)
                  </div>
                  <Input
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    placeholder="e.g. lose 10lbs in 30 days"
                    className="h-10 border-border bg-secondary/30 text-sm focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 px-2">
                <div className="hidden items-center gap-2 md:flex">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Quick Select:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AUDIENCE_PRESETS.slice(0, 3).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAudience(a)}
                        className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium transition hover:border-primary/50 hover:bg-primary/5"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !topic.trim()}
                  className="h-11 px-8 font-bold shadow-lg shadow-primary/20"
                  style={{ background: "var(--grad-accent)" }}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Demand...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate High-Demand Titles
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Demand-backed scoring
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Audience-specific targeting
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Sorting by Volume & Intent
              </span>
            </div>
          </div>

          {mutation.isError && (
            <p className="mt-4 text-sm font-medium text-destructive">
              {(mutation.error as Error).message}
            </p>
          )}
        </section>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {!showVault ? (
          <>
            {mutation.data?.ideas && (
              <div className="space-y-8">
                {/* Sort & Filter Bar ... (keep existing) */}
                <div className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/80 p-3 backdrop-blur-xl shadow-premium">
                  {/* ... contents of sort/filter bar ... */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <Filter className="h-3.5 w-3.5" />
                      Filter:
                    </div>
                    <Select value={filterFormat} onValueChange={setFilterFormat}>
                      <SelectTrigger className="h-9 w-[130px] bg-secondary/50">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterAudience} onValueChange={setFilterAudience}>
                      <SelectTrigger className="h-9 w-[150px] bg-secondary/50">
                        <SelectValue placeholder="Audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <SortAsc className="h-3.5 w-3.5" />
                      Sort:
                    </div>
                    <Select value={sortBy} onValueChange={(v: string) => setSortBy(v)}>
                      <SelectTrigger className="h-9 w-[140px] bg-primary/10 font-semibold text-primary">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trend">Composite Trend</SelectItem>
                        <SelectItem value="demand">Active Demand</SelectItem>
                        <SelectItem value="volume">Search Volume</SelectItem>
                        <SelectItem value="intent">Buyer Intent</SelectItem>
                        <SelectItem value="comp">Lowest Comp.</SelectItem>
                        <SelectItem value="conv">Opt-in Potential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results Grid */}
                {filteredIdeas.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {filteredIdeas.map((idea: TitleIdea, i: number) => {
                      const isSaved = vault.some((v) => v.idea.title === idea.title);
                      return (
                        <article
                          key={i}
                          className="group relative flex flex-col gap-4 rounded-3xl border border-border bg-card p-7 transition-all hover:border-primary/40 hover:shadow-premium"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-secondary text-[10px] uppercase tracking-wider font-bold"
                              >
                                {idea.format}
                              </Badge>
                              <TrendBadge score={idea.trend_score} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => !isSaved && saveToVault(idea)}
                                variant="outline"
                                size="sm"
                                disabled={isSaved}
                                className={`h-8 rounded-full border-primary/20 px-3 text-[10px] font-bold uppercase tracking-wider ${isSaved ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-primary/5 hover:text-primary"}`}
                              >
                                {isSaved ? (
                                  <>
                                    <Check className="mr-1.5 h-3 w-3" /> Saved
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-1.5 h-3 w-3" /> Save to Vault
                                  </>
                                )}
                              </Button>
                              <button
                                onClick={() => copy(idea.title, i)}
                                className="rounded-full bg-secondary/50 p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                                aria-label="Copy title"
                              >
                                {copied === i ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
                              {idea.title}
                            </h3>
                            <p className="text-base italic text-muted-foreground">"{idea.hook}"</p>
                          </div>

                          <ScoreBars
                            demand={idea.demand_score}
                            volume={idea.volume_score}
                            intent={idea.intent_score}
                            competition={idea.competition_score}
                            conversion={idea.conversion_score}
                            rationale={idea.score_rationale}
                          />

                          <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <ShoppingBag className="h-3 w-3" />
                                  Marketplace Audit
                                </span>
                                <DensityBadge density={idea.density} />
                              </div>
                              <p className="text-xs text-foreground leading-snug">
                                {idea.marketplace_data}
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-2">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <DollarSign className="h-3.5 w-3.5" />
                                Suggested Pricing
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="text-xs font-bold text-primary">
                                  {idea.price_usd}{" "}
                                  <span className="opacity-60 font-medium">USD</span>
                                </div>
                                <div className="text-xs font-bold text-accent">
                                  {idea.price_ngn}{" "}
                                  <span className="opacity-60 font-medium">NGN</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto space-y-3 border-t border-border pt-5 text-[13px]">
                            <Row
                              icon={<Users className="h-4 w-4 text-primary" />}
                              label="Audience"
                              value={idea.audience}
                            />
                            <Row
                              icon={<TrendingUp className="h-4 w-4 text-primary" />}
                              label="Demand Signal"
                              value={idea.search_signal}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                              onClick={() => openOutline(idea)}
                              variant="outline"
                              className="h-10 rounded-xl border-primary/20 text-[11px] font-bold uppercase tracking-wider hover:bg-primary/5"
                            >
                              <BookOpen className="mr-2 h-3.5 w-3.5 text-primary" />
                              Outline
                            </Button>
                            <Button
                              onClick={() => openSalesCopy(idea)}
                              variant="outline"
                              className="h-10 rounded-xl border-accent/20 text-[11px] font-bold uppercase tracking-wider hover:bg-accent/5"
                            >
                              <MessageSquare className="mr-2 h-3.5 w-3.5 text-accent" />
                              Marketing
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border py-20 text-center">
                    <div className="mb-4 rounded-full bg-secondary p-4">
                      <Filter className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">No ideas match these filters</h3>
                    <p className="mt-1 text-muted-foreground">
                      Try clearing your filters or generating more ideas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!mutation.data && !mutation.isPending && (
              <div className="grid gap-6 rounded-3xl border border-border bg-card p-10 md:grid-cols-3 shadow-premium">
                <Feature
                  icon={<TrendingUp className="h-6 w-6 text-primary" />}
                  title="Demand-grounded"
                  text="Every idea is verified against live search signals from Google, Reddit & YouTube."
                />
                <Feature
                  icon={<Target className="h-6 w-6 text-primary" />}
                  title="Audience-specific"
                  text="Target exact segments like 'pastors' or 'Nigerian moms' for high resonance."
                />
                <Feature
                  icon={<Zap className="h-6 w-6 text-primary" />}
                  title="High Intent"
                  text="Identify ideas with commercial intent so you build what actually sells."
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">My Idea Vault</h2>
                <p className="text-muted-foreground">
                  Organize and execute your high-demand product ideas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Workspace Stats
                  </span>
                  <div className="flex gap-4">
                    <span className="text-sm font-bold">
                      {vault.length}{" "}
                      <span className="font-normal text-muted-foreground">Ideas</span>
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {vault.filter((v) => v.status === "Published").length}{" "}
                      <span className="font-normal text-muted-foreground">Live</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {vault.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {vault.map((v) => (
                  <article
                    key={v.id}
                    className="group relative flex flex-col gap-4 rounded-3xl border border-border bg-card p-7 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={v.status} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Saved {new Date(v.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => updateVaultStatus(v.id, "Saved")}>
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Saved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateVaultStatus(v.id, "In Progress")}>
                            <Rocket className="mr-2 h-4 w-4 text-primary" /> In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateVaultStatus(v.id, "Published")}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Published
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => removeFromVault(v.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Vault
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="text-2xl font-bold leading-tight">{v.idea.title}</h3>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-secondary text-[10px] uppercase tracking-wider font-bold"
                      >
                        {v.idea.format}
                      </Badge>
                      <DensityBadge density={v.idea.density} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <Button
                        onClick={() => openOutline(v.idea)}
                        className="h-11 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 font-bold"
                      >
                        <BookOpen className="mr-2 h-4 w-4 text-primary" />
                        Outline
                      </Button>
                      <Button
                        onClick={() => openSalesCopy(v.idea)}
                        className="h-11 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
                      >
                        <Rocket className="mr-2 h-4 w-4" />
                        Draft Assets
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border py-32 text-center bg-secondary/5">
                <div className="mb-6 rounded-2xl bg-secondary p-6">
                  <Plus className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold">Your vault is empty</h3>
                <p className="mt-2 max-w-sm text-muted-foreground">
                  Save your favorite high-demand ideas here to track your progress from idea to
                  published product.
                </p>
                <Button
                  onClick={() => setShowVault(false)}
                  className="mt-8 h-12 px-8 font-bold"
                  style={{ background: "var(--grad-accent)" }}
                >
                  Discover New Ideas
                </Button>
              </div>
            )}
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

      <PaywallDialog
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        email={paywallEmail}
        setEmail={setPaywallEmail}
        onUpgrade={handleUpgrade}
        onRestore={handleRestore}
        isLoading={paymentLoading}
        error={paymentError}
      />

      <SalesCopyDialog
        idea={salesCopyFor}
        onClose={() => setSalesCopyFor(null)}
        copy={salesCopyMutation.data}
        isLoading={salesCopyMutation.isPending}
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

function StatusBadge({ status }: { status: VaultStatus }) {
  if (status === "Published") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700 border border-green-200">
        <CheckCircle className="h-3 w-3" /> Published
      </span>
    );
  }
  if (status === "In Progress") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/20">
        <Rocket className="h-3 w-3" /> In Progress
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-border">
      <Clock className="h-3 w-3" /> Saved
    </span>
  );
}

function SalesCopyDialog({
  idea,
  onClose,
  copy,
  isLoading,
}: {
  idea: TitleIdea | null;
  onClose: () => void;
  copy: SalesCopy | undefined;
  isLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"page" | "social">("page");
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={!!idea} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Marketing Assets
          </DialogTitle>
          <DialogDescription>
            One-click sales copy and social posts for:{" "}
            <span className="font-bold text-foreground">{idea?.title}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Drafting high-converting copy using AIDA framework...
            </p>
          </div>
        )}

        {copy && !isLoading && (
          <div className="space-y-6">
            <div className="flex gap-2 rounded-xl border border-border bg-secondary/30 p-1">
              <button
                onClick={() => setActiveTab("page")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${activeTab === "page" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Product Page (Selar/Gumroad)
              </button>
              <button
                onClick={() => setActiveTab("social")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${activeTab === "social" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Social Media Posts
              </button>
            </div>

            {activeTab === "page" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Landing Page Headline
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(copy.headline, "h")}
                    >
                      {copied === "h" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <h3 className="text-2xl font-extrabold leading-tight">{copy.headline}</h3>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Product Description
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(copy.description, "d")}
                    >
                      {copied === "d" ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-2">Copy All</span>
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap font-medium leading-relaxed">
                    {copy.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {copy.social_posts.map((post, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {post.platform}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(post.content, `s-${i}`)}
                      >
                        {copied === `s-${i}` ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DensityBadge({ density }: { density: TitleIdea["density"] }) {
  let styles = "bg-green-100 text-green-700 border-green-200";
  let icon = <Globe className="h-2.5 w-2.5" />;

  if (density === "Emerging") {
    styles = "bg-amber-100 text-amber-700 border-amber-200";
    icon = <TrendingUp className="h-2.5 w-2.5" />;
  } else if (density === "Saturated") {
    styles = "bg-red-100 text-red-700 border-red-200";
    icon = <AlertCircle className="h-2.5 w-2.5" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${styles}`}
    >
      {icon}
      {density}
    </span>
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
  volume,
  intent,
  competition,
  conversion,
  rationale,
}: {
  demand: number;
  volume: number;
  intent: number;
  competition: number;
  conversion: number;
  rationale: string;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-secondary/30 p-4">
      <div className="grid grid-cols-2 gap-4 pb-2">
        <MetricBadge label="Volume" value={volume} icon={<BarChart3 className="h-3 w-3" />} />
        <MetricBadge
          label="Intent"
          value={intent}
          icon={<MousePointerClick className="h-3 w-3" />}
        />
      </div>
      <div className="space-y-1.5 border-t border-border pt-2">
        <Bar label="Demand" value={demand} />
        <Bar label="Low comp." value={competition} />
        <Bar label="Conversion" value={conversion} />
      </div>
      {rationale && (
        <p className="pt-2 text-[11px] leading-snug text-muted-foreground">{rationale}</p>
      )}
    </div>
  );
}

function MetricBadge({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  const v = Math.round(value ?? 0);
  const color = v >= 70 ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary/50";
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${color}`}>
      {icon}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-bold uppercase tracking-tight opacity-70">{label}</span>
        <span className="text-xs font-bold">{v}%</span>
      </div>
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
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

        {error && !isLoading && <p className="py-6 text-sm text-destructive">{error.message}</p>}

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

            <div
              className="rounded-xl border border-primary/30 p-4"
              style={{ background: "var(--grad-hero)" }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Closing CTA
              </div>
              <p className="mt-1 text-sm">{outline.cta}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaywallDialog({
  open,
  onClose,
  email,
  setEmail,
  onUpgrade,
  isLoading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  setEmail: (e: string) => void;
  onUpgrade: () => void;
  onRestore: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <div className="relative flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute -right-2 -top-2 rounded-full bg-secondary p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-8 w-8" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Unlock Unlimited Ideas</DialogTitle>
            <DialogDescription className="mt-2 text-balance text-muted-foreground">
              You've used your free generation. Upgrade to TitleForge Pro to keep forging
              high-converting lead magnets.
            </DialogDescription>
          </DialogHeader>

          <div className="my-8 w-full space-y-4 rounded-2xl border border-border bg-secondary/30 p-6 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Pro Plan</span>
              <span className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">$2</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Unlimited title generations</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Unlimited chapter outlines</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Future premium features included</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2 text-left">
              <label
                htmlFor="p-email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email for account
              </label>
              <Input
                id="p-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            <div className="space-y-2">
              <Button
                onClick={onUpgrade}
                disabled={isLoading || !email.includes("@")}
                className="h-12 w-full text-base font-bold text-primary-foreground"
                style={{ background: "var(--grad-accent)" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Securing session...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    Upgrade for $2/month
                  </>
                )}
              </Button>

              <Button
                onClick={onRestore}
                disabled={isLoading || !email.includes("@")}
                variant="ghost"
                className="h-10 w-full text-xs font-bold text-muted-foreground hover:text-primary"
              >
                Already subscribed? Restore access
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Secure payments powered by Paystack. Cancel anytime.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
