import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Building2, User, Users, Layers } from "lucide-react";

export default function Settings() {
  const { user, role, organization, refreshOrg } = useAuth();
  const isAdmin = role === "admin";

  // Profile state
  const [fullName, setFullName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Org state
  const [orgName, setOrgName] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);

  // Team state
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDept, setNewDept] = useState("");

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setFullName(data.full_name ?? "");
    });
    // Load org
    if (organization) {
      setOrgName(organization.name);
      setOrgWebsite(organization.website ?? "");
      setOrgPhone(organization.phone ?? "");
      setOrgAddress(organization.address ?? "");
      setOrgIndustry(organization.industry ?? "");
    }
    // Load team
    if (isAdmin) {
      supabase.from("profiles").select("user_id, full_name").then(({ data }) => {
        if (data) {
          // Load roles for each member
          Promise.all(data.map(async (p: any) => {
            const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", p.user_id);
            return { ...p, roles: roles?.map((r: any) => r.role) ?? [] };
          })).then(setMembers);
        }
      });
      supabase.from("departments").select("*").order("name").then(({ data }) => setDepartments(data ?? []));
    }
  }, [user, organization, isAdmin]);

  const saveProfile = async () => {
    setProfileLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user!.id);
    setProfileLoading(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  const saveOrg = async () => {
    if (!organization) return;
    setOrgLoading(true);
    const { error } = await supabase.from("organizations").update({
      name: orgName, website: orgWebsite || null, phone: orgPhone || null,
      address: orgAddress || null, industry: orgIndustry || null,
    } as any).eq("id", organization.id);
    setOrgLoading(false);
    if (error) toast.error(error.message); else { toast.success("Organization updated"); refreshOrg(); }
  };

  const addDepartment = async () => {
    if (!newDept.trim() || !organization) return;
    const { error } = await supabase.from("departments").insert({ name: newDept, org_id: organization.id } as any);
    if (error) toast.error(error.message); else {
      toast.success("Department added");
      setNewDept("");
      supabase.from("departments").select("*").order("name").then(({ data }) => setDepartments(data ?? []));
    }
  };

  const deleteDepartment = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) toast.error(error.message); else {
      toast.success("Department deleted");
      setDepartments(departments.filter((d) => d.id !== id));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and organization</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
            {isAdmin && <TabsTrigger value="organization" className="gap-2"><Building2 className="h-4 w-4" /> Organization</TabsTrigger>}
            {isAdmin && <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>}
            {isAdmin && <TabsTrigger value="departments" className="gap-2"><Layers className="h-4 w-4" /> Departments</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Badge variant="outline">{role ?? "agent"}</Badge>
                </div>
                <Button onClick={saveProfile} disabled={profileLoading}>
                  {profileLoading ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="organization" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>Manage your company information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input value={orgIndustry} onChange={(e) => setOrgIndustry(e.target.value)} placeholder="e.g. Technology" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} />
                  </div>
                  <Button onClick={saveOrg} disabled={orgLoading}>
                    {orgLoading ? "Saving..." : "Save Organization"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="team" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>View and manage team members</CardDescription>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>
                  ) : (
                    <div className="overflow-x-auto"><Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Roles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((m) => (
                          <TableRow key={m.user_id}>
                            <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {m.roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table></div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="departments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription>Organize your team into departments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Department name" />
                    <Button onClick={addDepartment}>Add</Button>
                  </div>
                  {departments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No departments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {departments.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <span className="font-medium text-sm">{d.name}</span>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteDepartment(d.id)}>
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
