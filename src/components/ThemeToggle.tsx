import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — accessible Light / Dark / System picker.
 *
 * Renders a neutral icon button until `mounted`, then swaps to reflect the
 * resolved theme. This defers icon selection past hydration so SSR-style
 * mismatches and FOUC-chasing layout shifts don't occur (the inline
 * bootstrap in `index.html` has already applied `.dark` by paint time;
 * here we just keep the React tree honest).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentIcon = (() => {
    if (!mounted) return <Sun className="h-4 w-4" aria-hidden="true" />;
    if (theme === "system") return <Monitor className="h-4 w-4" aria-hidden="true" />;
    if (resolvedTheme === "dark") return <Moon className="h-4 w-4" aria-hidden="true" />;
    return <Sun className="h-4 w-4" aria-hidden="true" />;
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className={className ?? "h-9 w-9"}
        >
          {currentIcon}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" aria-hidden="true" /> Light
          {mounted && theme === "light" && (
            <Check className="ml-auto h-4 w-4" aria-hidden="true" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" aria-hidden="true" /> Dark
          {mounted && theme === "dark" && (
            <Check className="ml-auto h-4 w-4" aria-hidden="true" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" aria-hidden="true" /> System
          {mounted && theme === "system" && (
            <Check className="ml-auto h-4 w-4" aria-hidden="true" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
