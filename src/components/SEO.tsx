import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Production hostname. NOTE: this is inferred — the real public hostname for
 * QuoteKit was not known at build time. Update SITE_URL when the production
 * domain is finalized.
 */
export const SITE_URL = "https://quotekit.app";
export const SITE_NAME = "QuoteKit";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/social-card.svg`;

type StructuredData = Record<string, unknown> | Record<string, unknown>[];

export interface SEOProps {
  title: string;
  description: string;
  /** Path-only canonical (e.g. "/login"). Falls back to current location.pathname. */
  canonicalPath?: string;
  /** Absolute or root-relative image URL. Root-relative is upgraded to absolute. */
  image?: string;
  ogType?: "website" | "article" | "product";
  /** When true, adds `<meta name="robots" content="noindex,nofollow">`. */
  noindex?: boolean;
  /** Optional JSON-LD blob (Schema.org). One per page. */
  jsonLd?: StructuredData;
}

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
): HTMLMetaElement | HTMLLinkElement {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(
    selector,
  );
  if (!el) {
    const tag = selector.startsWith("link") ? "link" : "meta";
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function setMetaByName(name: string, content: string) {
  upsertMeta(`meta[name="${name}"]`, { name, content });
}

function setMetaByProperty(property: string, content: string) {
  upsertMeta(`meta[property="${property}"]`, { property, content });
}

function setLink(rel: string, href: string) {
  upsertMeta(`link[rel="${rel}"]`, { rel, href });
}

function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * SEO — mounts head-tag side effects (title, description, canonical, OG,
 * Twitter, optional JSON-LD) for a route. Drop one near the top of each page.
 */
export function SEO({
  title,
  description,
  canonicalPath,
  image,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOProps) {
  const location = useLocation();
  const path = canonicalPath ?? location.pathname;
  const url = toAbsoluteUrl(path);
  const fullImage = image ? toAbsoluteUrl(image) : DEFAULT_OG_IMAGE;

  useEffect(() => {
    document.title = title;

    setMetaByName("description", description);
    setLink("canonical", url);

    if (noindex) {
      setMetaByName("robots", "noindex,nofollow");
    } else {
      setMetaByName("robots", "index,follow");
    }

    setMetaByProperty("og:title", title);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:url", url);
    setMetaByProperty("og:type", ogType);
    setMetaByProperty("og:site_name", SITE_NAME);
    setMetaByProperty("og:image", fullImage);

    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", title);
    setMetaByName("twitter:description", description);
    setMetaByName("twitter:image", fullImage);
    setMetaByName("twitter:url", url);

    const existing = document.getElementById("page-jsonld");
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "page-jsonld";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, url, fullImage, ogType, noindex, jsonLd]);

  return null;
}

export default SEO;
