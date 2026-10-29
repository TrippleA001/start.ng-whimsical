/**
 * Preview contract.
 *
 * `public/previews/<slug>.webm` + `public/previews/manifest.json`, produced by
 * `scripts/capture-previews.mjs`. A game with no clip falls back to an
 * animated cover (slow zoom + sheen) — never a blank card, never a spinner.
 */

export type PreviewMap = Record<string, string>;

let request: Promise<PreviewMap> | null = null;

/** Fetched once; a missing manifest is normal (most games have no clip yet). */
export function loadPreviews(): Promise<PreviewMap> {
  if (!request) {
    request = fetch("/previews/manifest.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : ({} as PreviewMap)))
      .catch(() => ({} as PreviewMap));
  }
  return request;
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function saveData() {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  return Boolean(connection?.saveData);
}

/** No motion budget → the poster plus an explicit control, never autoplay. */
export function canAutoplayPreviews() {
  return !prefersReducedMotion() && !saveData();
}
