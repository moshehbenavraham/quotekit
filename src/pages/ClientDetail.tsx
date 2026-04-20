import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Phone, Building2, FileText, StickyNote } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  viewed: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type Proposal = {
  id: string;
  title: string;
  status: string;
  total: number;
  created_at: string;
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("proposals").select("id, title, status, total, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    ]).then(([cRes, pRes]) => {
      setClient(cRes.data as Client | null);
      setProposals((pRes.data ?? []) as Proposal[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button className="mt-4" onClick={() => navigate("/clients")}>Back to clients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const totalRevenue = proposals.filter(p => p.status === "accepted").reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalProposals = proposals.length;
  const acceptedCount = proposals.filter(p => p.status === "accepted").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.company || "No company"} · Added {format(new Date(client.created_at), "MMM d, yyyy")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Proposals</p>
              <p className="text-2xl font-bold font-display text-card-foreground">{totalProposals}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Accepted</p>
              <p className="text-2xl font-bold font-display text-success">{acceptedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold font-display text-card-foreground">${totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-card-foreground">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-card-foreground">{client.phone}</span>
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-card-foreground">{client.company}</span>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-2 text-sm">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground whitespace-pre-wrap">{client.notes}</span>
              </div>
            )}
            {!client.email && !client.phone && !client.company && !client.notes && (
              <p className="text-sm text-muted-foreground">No contact details</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No proposals for this client yet</p>
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/proposals/new">Create Proposal</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${Number(p.total || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
