import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Users, DollarSign, Clock, PlusCircle, ArrowRight } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";

type Proposal = {
  id: string;
  title: string;
  status: string;
  total: number;
  created_at: string;
  clients: { name: string } | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  viewed: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let query = supabase
        .from("proposals")
        .select("id, title, status, total, created_at, clients(name)")
        .order("created_at", { ascending: false });

      if (role === "agent") {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      const rows = (data ?? []) as Proposal[];
      setAllProposals(rows);
      setProposals(rows.slice(0, 10));

      const total = rows.length;
      const pending = rows.filter((p) => p.status === "sent" || p.status === "viewed").length;
      const accepted = rows.filter((p) => p.status === "accepted").length;
      const revenue = rows.filter((p) => p.status === "accepted").reduce((s, p) => s + (Number(p.total) || 0), 0);
      setStats({ total, pending, accepted, revenue });
      setLoading(false);
    };
    load();
  }, [user, role]);

  const chartData = useMemo(() => {
    const months: { month: string; created: number; accepted: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(startOfMonth(d), "yyyy-MM");
      const label = format(d, "MMM");
      const inMonth = allProposals.filter(p => p.created_at.startsWith(key));
      months.push({ month: label, created: inMonth.length, accepted: inMonth.filter(p => p.status === "accepted").length });
    }
    return months;
  }, [allProposals]);

  const chartConfig = {
    created: { label: "Created", color: "hsl(var(--primary))" },
    accepted: { label: "Accepted", color: "hsl(var(--success, 142 71% 45%))" },
  };

  const statCards = [
    { label: "Total Proposals", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Accepted", value: stats.accepted, icon: Users, color: "text-success" },
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {role === "admin" ? "Organization-wide overview" : "Your proposals and activity"}
            </p>
          </div>
          <Button asChild className="gap-2 w-full sm:w-auto">
            <Link to="/proposals/new"><PlusCircle className="h-4 w-4" /> New Proposal</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-accent ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold font-display text-card-foreground">{loading ? "—" : s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Proposals (6 months)</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="created" fill="var(--color-created)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accepted" fill="var(--color-accepted)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Conversion Trend</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={chartData.map(d => ({ ...d, rate: d.created > 0 ? Math.round((d.accepted / d.created) * 100) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis unit="%" className="text-xs fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="Conversion %" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="font-display text-lg">Recent Proposals</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/proposals" className="gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No proposals yet</p>
                <Button size="sm" className="mt-4 gap-2" asChild>
                  <Link to="/proposals/new"><PlusCircle className="h-4 w-4" /> Create your first proposal</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.map((p) => (
                  <Link
                    key={p.id}
                    to={`/proposals/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-card-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.clients?.name ?? "No client"} · {format(new Date(p.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-card-foreground">${Number(p.total || 0).toLocaleString()}</span>
                      <Badge variant="outline" className={statusColors[p.status]}>
                        {p.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
