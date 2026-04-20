import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle, Search, FileText, ArrowUpDown, MoreHorizontal, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Proposal = {
  id: string;
  title: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  content: any;
  pricing: any;
  template_id: string | null;
  client_id: string | null;
  tax_rate: number | null;
  subtotal: number | null;
  notes: string | null;
  org_id: string | null;
  clients: { name: string } | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  viewed: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

type SortKey = "title" | "client" | "status" | "total" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

export default function Proposals() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!user) return;
    let query = supabase
      .from("proposals")
      .select("id, title, status, total, created_at, updated_at, content, pricing, template_id, client_id, tax_rate, subtotal, notes, org_id, clients(name)")
      .order("updated_at", { ascending: false });

    if (role === "agent") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    setProposals((data ?? []) as Proposal[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, role]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...proposals]
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.clients?.name ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "title": return dir * a.title.localeCompare(b.title);
        case "client": return dir * (a.clients?.name ?? "").localeCompare(b.clients?.name ?? "");
        case "status": return dir * a.status.localeCompare(b.status);
        case "total": return dir * ((a.total || 0) - (b.total || 0));
        case "created_at": return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case "updated_at": return dir * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        default: return 0;
      }
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete line items first, then proposal
    await supabase.from("line_items").delete().eq("proposal_id", deleteTarget.id);
    const { error } = await supabase.from("proposals").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Proposal deleted");
      setProposals(proposals.filter(p => p.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleDuplicate = async (p: Proposal) => {
    if (!user) return;

    // Insert duplicated proposal
    const { data: newProposal, error } = await supabase.from("proposals").insert({
      title: `${p.title} (Copy)`,
      status: "draft",
      content: p.content,
      pricing: p.pricing,
      template_id: p.template_id,
      client_id: p.client_id,
      tax_rate: p.tax_rate,
      subtotal: p.subtotal,
      total: p.total,
      notes: p.notes,
      user_id: user.id,
      org_id: p.org_id || "00000000-0000-0000-0000-000000000001",
    } as any).select("id").single();

    if (error || !newProposal) {
      toast.error("Failed to duplicate: " + (error?.message ?? "Unknown error"));
      return;
    }

    // Duplicate line items (without amount — it's generated)
    const { data: existingItems } = await supabase
      .from("line_items")
      .select("description, quantity, rate, discount, sort_order")
      .eq("proposal_id", p.id);

    if (existingItems && existingItems.length > 0) {
      await supabase.from("line_items").insert(
        existingItems.map((li: any) => ({ ...li, proposal_id: newProposal.id }))
      );
    }

    toast.success("Proposal duplicated");
    load();
  };

  const SortableHead = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort(sortKeyName)}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? "text-foreground" : "text-muted-foreground/50"}`} />
      </button>
    </TableHead>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Proposals</h1>
            <p className="text-sm text-muted-foreground">
              {role === "admin" ? "All organization proposals" : "Your proposals"}
            </p>
          </div>
          <Button asChild className="gap-2 w-full sm:w-auto">
            <Link to="/proposals/new"><PlusCircle className="h-4 w-4" /> New Proposal</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search proposals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">{search || statusFilter !== "all" ? "No matching proposals" : "No proposals yet"}</p>
                {!search && statusFilter === "all" && (
                  <Button size="sm" className="mt-4 gap-2" asChild>
                    <Link to="/proposals/new"><PlusCircle className="h-4 w-4" /> Create your first proposal</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Title" sortKeyName="title" />
                    <SortableHead label="Client" sortKeyName="client" />
                    <SortableHead label="Status" sortKeyName="status" />
                    <SortableHead label="Total" sortKeyName="total" className="text-right" />
                    <SortableHead label="Created" sortKeyName="created_at" />
                    <SortableHead label="Last Modified" sortKeyName="updated_at" />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.clients?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${Number(p.total || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(p.updated_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Proposal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
