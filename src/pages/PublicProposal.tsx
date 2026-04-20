import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Lock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PublicProposal() {
  const { shareId } = useParams<{ shareId: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [expired, setExpired] = useState(false);

  const loadProposal = async (proposalData?: any) => {
    const p = proposalData;
    if (!p) return;

    setProposal(p);
    const { data: li } = await supabase.from("line_items").select("*").eq("proposal_id", p.id).order("sort_order");
    setLineItems(li ?? []);

    // Log view event (no IP — privacy by design)
    await supabase.from("proposal_events").insert({
      proposal_id: p.id,
      event_type: "viewed",
      user_agent: navigator.userAgent,
    } as any);

    // Load org branding
    if (p.org_id) {
      const { data: o } = await supabase.from("organizations").select("name, logo_url, brand_primary_color").eq("id", p.org_id).single();
      setOrg(o);
    }
  };

  useEffect(() => {
    if (!shareId) return;
    const load = async () => {
      // First try to load — RLS will block password-protected proposals
      const { data: p, error } = await supabase
        .from("proposals")
        .select("*, clients(name)")
        .eq("share_id", shareId)
        .neq("status", "draft")
        .single();

      if (p) {
        // Check if expired client-side as well
        if (p.share_expires_at && new Date(p.share_expires_at) < new Date()) {
          setExpired(true);
          setLoading(false);
          return;
        }
        await loadProposal(p);
      } else {
        // Could be password-protected or truly not found
        // Check if it needs a password by calling the edge function with empty password
        setNeedsPassword(true);
      }
      setLoading(false);
    };
    load();
  }, [shareId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-share-password", {
        body: { share_id: shareId, password },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Verification failed");
        setVerifying(false);
        return;
      }

      // Edge function returns full proposal data — no second Supabase query needed
      // (RLS no longer allows direct access to password-protected proposals)
      if (data.proposal) {
        setNeedsPassword(false);
        setProposal(data.proposal);
        setLineItems(data.lineItems ?? []);
        setOrg(data.org ?? null);
      } else {
        toast.error("Could not load proposal");
      }
    } catch {
      toast.error("Verification failed");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">This share link has expired</p>
        </div>
      </div>
    );
  }

  if (needsPassword && !proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
            <CardTitle className="mt-2">Password Required</CardTitle>
            <p className="text-sm text-muted-foreground">This proposal is password-protected.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? "Verifying…" : "View Proposal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">Proposal not found or no longer available</p>
        </div>
      </div>
    );
  }

  const sections = Array.isArray((proposal.content as any)?.sections) ? (proposal.content as any).sections : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">{org?.name ?? "QuoteKit"}</span>
          </div>
          <Badge variant="outline">{proposal.status}</Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{proposal.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {proposal.clients?.name ? `Prepared for ${proposal.clients.name}` : ""} · {format(new Date(proposal.created_at), "MMMM d, yyyy")}
          </p>
        </div>

        {sections.map((sec: any, idx: number) => (
          <Card key={idx}>
            <CardHeader><CardTitle>{sec.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{sec.content}</p></CardContent>
          </Card>
        ))}

        {lineItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Investment</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>{li.description}</TableCell>
                      <TableCell className="text-right">{li.quantity}</TableCell>
                      <TableCell className="text-right">${Number(li.rate).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">${Number(li.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 border-t pt-4 text-right">
                <div className="text-2xl font-bold">${Number(proposal.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {proposal.valid_until && (
          <p className="text-sm text-muted-foreground text-center">
            Valid until {format(new Date(proposal.valid_until), "MMMM d, yyyy")}
          </p>
        )}

        {/* Privacy notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pt-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Your privacy is protected. No personally identifiable information is stored when viewing this proposal.</span>
        </div>
      </main>
    </div>
  );
}
