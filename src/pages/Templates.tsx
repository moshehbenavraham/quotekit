import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FolderOpen, FileText, PlusCircle, Code, BarChart3, Megaphone, Briefcase, Layers, Pencil, Trash2, Plus, Trash, GripVertical } from "lucide-react";
import { toast } from "sonner";

type Section = { title: string; default_content: string };
type PricingItem = { description: string; quantity: number; rate: number };

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_default: boolean;
  sections: Section[];
  default_pricing_items: PricingItem[];
  org_id: string | null;
};

const categoryIcons: Record<string, any> = {
  web_design: Layers,
  consulting: Briefcase,
  development: Code,
  marketing: Megaphone,
  general: FileText,
};

const categoryLabels: Record<string, string> = {
  web_design: "Web Design",
  consulting: "Consulting",
  development: "Development",
  marketing: "Marketing",
  general: "General",
};

const categories = ["all", "web_design", "consulting", "development", "marketing", "general"];

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [sections, setSections] = useState<Section[]>([{ title: "", default_content: "" }]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);

  const load = () => {
    supabase.from("templates").select("*").order("name").then(({ data }) => {
      setTemplates((data ?? []) as unknown as Template[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setCategory("general");
    setSections([{ title: "", default_content: "" }]);
    setPricingItems([]);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setCategory(t.category);
    setSections(Array.isArray(t.sections) && t.sections.length > 0 ? t.sections : [{ title: "", default_content: "" }]);
    setPricingItems(Array.isArray(t.default_pricing_items) ? t.default_pricing_items : []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      sections: sections.filter(s => s.title.trim()),
      default_pricing_items: pricingItems.filter(p => p.description.trim()),
    };

    if (editing) {
      const { error } = await supabase.from("templates").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase.from("templates").insert({
        ...payload,
        org_id: "00000000-0000-0000-0000-000000000001",
        user_id: user?.id,
        is_default: false,
      } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Template created");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Template deleted");
    load();
  };

  const addSection = () => setSections([...sections, { title: "", default_content: "" }]);
  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));
  const updateSection = (idx: number, field: keyof Section, value: string) => {
    const u = [...sections]; u[idx] = { ...u[idx], [field]: value }; setSections(u);
  };

  const addPricingItem = () => setPricingItems([...pricingItems, { description: "", quantity: 1, rate: 0 }]);
  const removePricingItem = (idx: number) => setPricingItems(pricingItems.filter((_, i) => i !== idx));
  const updatePricingItem = (idx: number, field: keyof PricingItem, value: any) => {
    const u = [...pricingItems]; u[idx] = { ...u[idx], [field]: value }; setPricingItems(u);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Templates</h1>
            <p className="text-sm text-muted-foreground">Manage and choose templates for proposals</p>
          </div>
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" /> New Template
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={filter === cat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(cat)}
            >
              {cat === "all" ? "All" : categoryLabels[cat] ?? cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              className="cursor-pointer border-dashed hover:border-primary/40 transition-colors"
              onClick={() => navigate("/proposals/new")}
            >
              <CardContent className="flex flex-col items-center justify-center h-48 gap-3">
                <PlusCircle className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">Start from blank</p>
              </CardContent>
            </Card>

            {filtered.map((t) => {
              const Icon = categoryIcons[t.category] ?? FileText;
              return (
                <Card key={t.id} className="group relative hover:shadow-md hover:border-primary/20 transition-all">
                  <CardContent className="flex flex-col justify-between h-48 p-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                            <Icon className="h-4 w-4 text-accent-foreground" />
                          </div>
                          {t.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                        </div>
                        {!t.is_default && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <h3
                        className="font-display font-semibold text-card-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/proposals/new?template=${t.id}`)}
                      >
                        {t.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="w-fit text-xs">
                        {categoryLabels[t.category] ?? t.category}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => navigate(`/proposals/new?template=${t.id}`)}
                      >
                        Use template →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No templates in this category</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS Proposal" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this template..." rows={2} />
            </div>

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Content Sections</Label>
                <Button size="sm" variant="outline" onClick={addSection}>
                  <Plus className="mr-1 h-3 w-3" /> Add Section
                </Button>
              </div>
              {sections.map((sec, idx) => (
                <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={sec.title}
                      onChange={(e) => updateSection(idx, "title", e.target.value)}
                      placeholder="Section title"
                      className="font-medium"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSection(idx)} disabled={sections.length === 1}>
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={sec.default_content}
                    onChange={(e) => updateSection(idx, "default_content", e.target.value)}
                    placeholder="Default content for this section..."
                    rows={3}
                  />
                </div>
              ))}
            </div>

            {/* Default pricing items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Default Pricing Items</Label>
                <Button size="sm" variant="outline" onClick={addPricingItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
              {pricingItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No default pricing items. Add some to pre-fill the pricing step.</p>
              )}
              {pricingItems.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    {idx === 0 && <Label className="text-xs">Description</Label>}
                    <Input value={item.description} onChange={(e) => updatePricingItem(idx, "description", e.target.value)} placeholder="Line item" />
                  </div>
                  <div className="w-20 space-y-1">
                    {idx === 0 && <Label className="text-xs">Qty</Label>}
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updatePricingItem(idx, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="w-24 space-y-1">
                    {idx === 0 && <Label className="text-xs">Rate ($)</Label>}
                    <Input type="number" min={0} value={item.rate} onChange={(e) => updatePricingItem(idx, "rate", Number(e.target.value))} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removePricingItem(idx)}>
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
