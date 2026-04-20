import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, LayoutDashboard, Users, FolderOpen, PlusCircle, Settings, LogOut, User, ClipboardList, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/proposals", icon: ClipboardList, label: "Proposals" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/templates", icon: FolderOpen, label: "Templates" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, signOut, organization } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center px-4 lg:px-6">
          {/* Left: logo + mobile hamburger */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold font-display text-foreground hidden sm:block">
                {organization?.name ?? "QuoteKit"}
              </span>
            </Link>
          </div>

          {/* Right-aligned: desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-end mr-3">
            {navItems.map((item) => {
              const isActive = item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("gap-2", isActive && "bg-accent text-accent-foreground")}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Sheet nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              {organization?.name ?? "QuoteKit"}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const isActive = item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-3 h-12", isActive && "bg-accent text-accent-foreground")}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="my-2 border-t border-border" />
            <Button className="w-full justify-start gap-3 h-12" onClick={() => { setMobileOpen(false); navigate("/proposals/new"); }}>
              <PlusCircle className="h-5 w-5" />
              New Proposal
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={() => { setMobileOpen(false); navigate("/settings"); }}>
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </nav>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
