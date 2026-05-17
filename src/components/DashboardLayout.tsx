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
import { ThemeToggle } from "@/components/ThemeToggle";
import { SkipToContent } from "@/components/SkipToContent";

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
      <SkipToContent />
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center px-4 lg:px-6">
          {/* Left: logo + mobile hamburger */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold font-display text-foreground hidden sm:block">
                {organization?.name ?? "QuoteKit"}
              </span>
            </Link>
          </div>

          {/* Right-aligned: desktop nav */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-1 flex-1 justify-end mr-3">
            {navItems.map((item) => {
              const isActive = item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("gap-2", isActive && "bg-accent text-accent-foreground")}
                >
                  <Link to={item.to} aria-current={isActive ? "page" : undefined}>
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="h-8 w-8" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  aria-label="User menu"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Sheet nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0" id="mobile-nav">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              {organization?.name ?? "QuoteKit"}
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Mobile primary" className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const isActive = item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3 h-12", isActive && "bg-accent text-accent-foreground")}
                >
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
            <div className="my-2 border-t border-border" />
            <Button asChild className="w-full justify-start gap-3 h-12">
              <Link to="/proposals/new" onClick={() => setMobileOpen(false)}>
                <PlusCircle className="h-5 w-5" aria-hidden="true" />
                New Proposal
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 h-12">
              <Link to="/settings" onClick={() => setMobileOpen(false)}>
                <Settings className="h-5 w-5" aria-hidden="true" />
                Settings
              </Link>
            </Button>
          </nav>
        </SheetContent>
      </Sheet>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-6 lg:px-6 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
