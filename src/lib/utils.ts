export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function nowLabel() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function uid(prefix = "m") {
  return `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** Downscale a data URL so it can live in localStorage without exploding. */
export function shrinkDataUrl(
  src: string,
  max = 880,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(src);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.fillStyle = "#08070c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/** Tiny inline markup: **bold**, *italic*, `code`, @mention */
export function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(?!\s)(.+?)(?<!\s)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<span class="code">$1</span>')
    .replace(
      /(^|\s)@([a-zA-Z][\w-]*)/g,
      '$1<span class="mention">@$2</span>',
    );
}
