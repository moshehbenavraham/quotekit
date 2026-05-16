import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type NextThemesProviderProps = ComponentProps<typeof NextThemesProvider>;

export type ThemeProviderProps = NextThemesProviderProps;

/**
 * ThemeProvider — wraps `next-themes` with QuoteKit defaults.
 *
 * - `attribute="class"` so Tailwind's `dark:` variants and the
 *   `.dark` palette in `src/index.css` light up.
 * - `defaultTheme="system"` honors the visitor's OS-level preference
 *   until they explicitly pick a theme.
 * - `enableSystem` lets `system` resolve dynamically as the OS flips.
 * - `disableTransitionOnChange` prevents the global `* { transition }`
 *   chain from animating during the swap (avoids the flash of
 *   half-transitioned colors).
 *
 * The matching pre-paint bootstrap lives inline in `index.html` so that
 * the first paint is already in the right theme.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="quotekit-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
