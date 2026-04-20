import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, PlusCircle, Trash2, Save, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Client = { id: string; name: string };
type Template = { id: string; name: string; sections: any; default_pricing_items: any; category?: string };
type LineItem = { description: string; quantity: number; rate: number; discount: number };

const STEPS = ["Template", "Client", "Content", "Pricing", "Review"];

export default function ProposalBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const isEditing = !!editId;

  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [title, setTitle] = useState("Untitled Proposal");
  const [sections, setSections] = useState<{ title: string; content: string }[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0, discount: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [tRes, cRes] = await Promise.all([
        supabase.from("templates").select("id, name, sections, default_pricing_items, category").order("name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);
      setTemplates((tRes.data ?? []) as Template[]);
      setClients((cRes.data ?? []) as Client[]);

      if (editId) {
        // Load existing proposal
        const [pRes, liRes] = await Promise.all([
          supabase.from("proposals").select("*").eq("id", editId).single(),
          supabase.from("line_items").select("*").eq("proposal_id", editId).order("sort_order"),
        ]);
        if (pRes.data) {
          const p = pRes.data as any;
          setTitle(p.title);
          setSelectedClient(p.client_id || "");
          setSelectedTemplate(p.template_id || "");
          setTaxRate(Number(p.tax_rate) || 0);
          setNotes(p.notes || "");
          const secs = Array.isArray(p.content?.sections) ? p.content.sections : [];
          setSections(secs);
          setStep(1); // Skip template step when editing
        }
        if (liRes.data && liRes.data.length > 0) {
          setLineItems(liRes.data.map((li: any) => ({
            description: li.description, quantity: Number(li.quantity), rate: Number(li.rate), discount: Number(li.discount) || 0,
          })));
        }
        setLoadingEdit(false);
      } else {
        const tmplId = searchParams.get("template");
        if (tmplId) {
          setSelectedTemplate(tmplId);
          const tmpl = (tRes.data ?? []).find((t: any) => t.id === tmplId);
          if (tmpl) {
            applyTemplate(tmpl as Template);
            setStep(1);
          }
        }
      }
    };
    load();
  }, []);

  const applyTemplate = (tmpl: Template) => {
    const secs = Array.isArray(tmpl.sections) ? tmpl.sections.map((s: any) => ({ title: s.title ?? "", content: s.default_content ?? "" })) : [];
    setSections(secs);
    const items = Array.isArray(tmpl.default_pricing_items) ? tmpl.default_pricing_items.map((i: any) => ({
      description: i.description ?? "", quantity: i.quantity ?? 1, rate: i.rate ?? 0, discount: 0,
    })) : [];
    if (items.length > 0) setLineItems(items);
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) applyTemplate(tmpl);
  };

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate * (1 - i.discount / 100), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, discount: 0 }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  };

  // Drag-and-drop handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...sections];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setSections(updated);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // AI improve handler
  const handleAiImprove = async (idx: number) => {
    setAiLoading(idx);
    try {
      const sec = sections[idx];
      const tmpl = templates.find(t => t.id === selectedTemplate);
      const { data, error } = await supabase.functions.invoke("ai-content", {
        body: {
          sectionTitle: sec.title,
          sectionContent: sec.content,
          templateCategory: tmpl?.category || "general",
          proposalTitle: title,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.content) {
        const updated = [...sections];
        updated[idx] = { ...updated[idx], content: data.content };
        setSections(updated);
        toast.success("Content improved with AI");
      }
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally {
      setAiLoading(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const proposalData = {
      title,
      client_id: selectedClient || null,
      template_id: selectedTemplate || null,
      content: { sections } as any,
      pricing: { line_items: lineItems, tax_rate: taxRate } as any,
      subtotal,
      tax_rate: taxRate,
      total,
      notes: notes || null,
    };

    let proposalId = editId;

    if (isEditing) {
      const { error } = await supabase.from("proposals").update(proposalData as any).eq("id", editId!);
      if (error) { toast.error(error.message); setSaving(false); return; }
      // Replace line items
      const { error: delError } = await supabase.from("line_items").delete().eq("proposal_id", editId!);
      if (delError) { toast.error("Failed to clear old pricing: " + delError.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("proposals").insert({
        ...proposalData,
        user_id: user.id,
        org_id: "00000000-0000-0000-0000-000000000001",
        status: "draft",
      } as any).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      proposalId = data?.id;
    }

    if (proposalId) {
      const validItems = lineItems.filter(li => li.description.trim());
      if (validItems.length > 0) {
        const items = validItems.map((li, idx) => ({
          proposal_id: proposalId!,
          description: li.description.trim(),
          quantity: li.quantity,
          rate: li.rate,
          discount: li.discount,
          sort_order: idx,
        }));
        const { error: liError } = await supabase.from("line_items").insert(items);
        if (liError) { toast.error("Failed to save pricing items: " + liError.message); setSaving(false); return; }
      }
    }

    toast.success(isEditing ? "Proposal updated" : "Proposal saved as draft");
    navigate(`/proposals/${proposalId}`);
    setSaving(false);
  };

  if (loadingEdit) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(isEditing ? `/proposals/${editId}` : "/proposals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{isEditing ? "Edit Proposal" : "New Proposal"}</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex-1 rounded-full h-2 transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 0: Template */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Choose a template</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${!selectedTemplate ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  onClick={() => { setSelectedTemplate(""); setSections([]); }}
                >
                  <PlusCircle className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Blank</p>
                </div>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`cursor-pointer rounded-lg border-2 p-6 transition-colors ${selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    onClick={() => handleTemplateSelect(t.id)}
                  >
                    <p className="font-medium text-sm">{t.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Client */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Assign a client</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Select a client (optional)" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Content with drag-and-drop + AI */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit content</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSections([...sections, { title: "", content: "" }])}>
                <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No sections. Add one or go back to pick a template.</p>
              )}
              {sections.map((sec, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`space-y-2 rounded-lg border border-border p-4 transition-opacity ${dragIdx === idx ? "opacity-50" : ""}`}
                >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="cursor-grab text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    <Input
                      value={sec.title}
                      onChange={(e) => {
                        const u = [...sections]; u[idx] = { ...u[idx], title: e.target.value }; setSections(u);
                      }}
                      placeholder="Section title"
                      className="font-medium border-0 p-0 h-auto text-base focus-visible:ring-0 flex-1"
                    />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs text-primary"
                        onClick={() => handleAiImprove(idx)}
                        disabled={aiLoading !== null}
                      >
                        {aiLoading === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Improve
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSections(sections.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={sec.content}
                    onChange={(e) => {
                      const u = [...sections]; u[idx] = { ...u[idx], content: e.target.value }; setSections(u);
                    }}
                    placeholder="Section content..."
                    rows={4}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pricing</CardTitle>
              <Button size="sm" variant="outline" onClick={addLineItem}>
                <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-border p-3 space-y-2 sm:border-0 sm:p-0 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end">
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-xs sm:hidden">Description</Label>
                    {idx === 0 && <Label className="text-xs hidden sm:block">Description</Label>}
                    <Input value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs sm:hidden">Qty</Label>
                      {idx === 0 && <Label className="text-xs hidden sm:block">Qty</Label>}
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs sm:hidden">Rate ($)</Label>
                      {idx === 0 && <Label className="text-xs hidden sm:block">Rate ($)</Label>}
                      <Input type="number" min={0} value={item.rate} onChange={(e) => updateLineItem(idx, "rate", Number(e.target.value))} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs sm:hidden">Disc %</Label>
                      {idx === 0 && <Label className="text-xs hidden sm:block">Disc %</Label>}
                      <Input type="number" min={0} max={100} value={item.discount} onChange={(e) => updateLineItem(idx, "discount", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Tax Rate (%)</Label>
                  <Input type="number" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-24" />
                </div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                {taxRate > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-medium">${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Review & Save</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{title}</span></div>
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{clients.find(c => c.id === selectedClient)?.name ?? "None"}</span></div>
                <div><span className="text-muted-foreground">Template:</span> <span className="font-medium">{templates.find(t => t.id === selectedTemplate)?.name ?? "Blank"}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>

              {/* Pricing breakdown */}
              {lineItems.filter(li => li.description.trim()).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Pricing Summary</Label>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-2 font-medium">Description</th>
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-right p-2 font-medium">Rate</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.filter(li => li.description.trim()).map((li, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="p-2">{li.description}</td>
                            <td className="text-right p-2">{li.quantity}</td>
                            <td className="text-right p-2">${Number(li.rate).toLocaleString()}</td>
                            <td className="text-right p-2 font-medium">${(li.quantity * li.rate * (1 - li.discount / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm"><span className="text-muted-foreground mr-4">Subtotal</span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    {taxRate > 0 && <div className="text-sm"><span className="text-muted-foreground mr-4">Tax ({taxRate}%)</span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                    <div className="text-lg font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )}

              {/* Sections preview */}
              {sections.filter(s => s.title.trim()).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Content Sections</Label>
                  {sections.filter(s => s.title.trim()).map((sec, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-3">
                      <h4 className="font-medium text-sm">{sec.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{sec.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : isEditing ? "Update Proposal" : "Save Draft"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
