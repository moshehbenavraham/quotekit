import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Sparkles,
  Share2,
  BarChart3,
  Palette,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroAsset from "@/assets/hero-dashboard.png.asset.json";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Writing",
    description:
      "Generate polished, persuasive proposal content in seconds with built-in AI assistance.",
  },
  {
    icon: Share2,
    title: "One-Click Sharing",
    description:
      "Send branded proposals via a secure link — no attachments, no friction.",
  },
  {
    icon: BarChart3,
    title: "Engagement Tracking",
    description:
      "Know the moment a client opens, reads, or accepts your proposal in real time.",
  },
  {
    icon: Palette,
    title: "Branded Templates",
    description:
      "Start from beautiful, customizable templates that match your company's identity.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Work together on proposals with role-based access and department organization.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description:
      "Track win rates, response times, and proposal performance across your team.",
  },
];

const steps = [
  {
    num: "01",
    title: "Create",
    description:
      "Pick a template, customize your content with AI help, and add your pricing.",
  },
  {
    num: "02",
    title: "Send",
    description:
      "Share a branded link with your client — they view it instantly in their browser.",
  },
  {
    num: "03",
    title: "Win",
    description:
      "Track engagement in real time, get notified on acceptance, and close the deal.",
  },
];

const logos = [
  "Acme Corp",
  "TechStart",
  "Global Media",
  "BrightPath",
  "Zenith",
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              QuoteKit
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Get started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/50 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-20 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Now with AI-powered content writing
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Win more deals with{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                beautiful proposals
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Create, send, and track stunning proposals that close. QuoteKit
              gives your team the tools to look professional and move fast.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 px-8 text-base w-full sm:w-auto"
                onClick={() => navigate("/signup")}
              >
                Start for free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base w-full sm:w-auto"
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative mx-auto mt-16 max-w-5xl animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-2 shadow-2xl shadow-primary/10">
              <img
                src={heroAsset.url}
                alt="QuoteKit proposal dashboard showing a professional proposal with pricing, status tracking, and client notifications"
                className="w-full rounded-lg"
                loading="eager"
              />
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/10 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-border bg-muted/50 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
            Trusted by 500+ teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {logos.map((name) => (
              <span
                key={name}
                className="font-display text-lg font-semibold text-muted-foreground/40"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need to win
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From drafting to tracking, QuoteKit handles every step of the
              proposal workflow.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Three steps to close
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              QuoteKit makes your proposal process effortless.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold">
                  {s.num}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist / value props */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Why teams switch to QuoteKit
            </h2>
            <ul className="mt-10 grid gap-4 text-left sm:grid-cols-2">
              {[
                "Close deals 40% faster",
                "Professional proposals in minutes",
                "Real-time open & view tracking",
                "AI writes your first draft",
                "Team-wide template library",
                "No more email attachments",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Ready to send proposals that win?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Join hundreds of teams already using QuoteKit to close more deals.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="h-12 px-8 text-base w-full sm:w-auto"
              onClick={() => navigate("/signup")}
            >
              Get started — it's free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base w-full sm:w-auto"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <FileText className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground">
              QuoteKit
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QuoteKit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
