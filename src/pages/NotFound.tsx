import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { SkipToContent } from "@/components/SkipToContent";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="Page not found — QuoteKit"
        description="The page you were looking for doesn't exist or has moved."
        noindex
      />
      <SkipToContent />
      <main
        id="main"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-muted focus:outline-none"
      >
        <div className="px-6 text-center">
          <p
            aria-hidden="true"
            className="font-display text-7xl font-extrabold tracking-tight text-primary sm:text-8xl"
          >
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
            We can't find that page
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            The link may be broken or the page may have moved. Let's get you
            back somewhere familiar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/">Return home</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default NotFound;
