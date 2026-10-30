import * as THREE from "three";

/**
 * Card textures.
 *
 * A card's WebGL face is drawn on a 2D canvas: the real cover when it loads
 * (drawn locally, so no cross-origin texture upload can fail), plus the same
 * information the DOM card carries — title, maker, metric and the enter pill.
 * If the cover never arrives, the card still looks finished.
 */

const W = 512;
const H = 320;

export type CardTexture = {
  texture: THREE.CanvasTexture;
  setCover: (image: HTMLImageElement | null) => void;
  dispose: () => void;
};

export function createCardTexture(options: {
  title: string;
  by: string;
  accent: string;
  metric: string;
}): CardTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  let cover: HTMLImageElement | null = null;

  const paint = () => {
    // base
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#14131c");
    bg.addColorStop(1, "#0a0910");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (cover) {
      // cover-fit
      const scale = Math.max(W / cover.width, H / cover.height);
      const dw = cover.width * scale;
      const dh = cover.height * scale;
      ctx.globalAlpha = 0.82;
      ctx.drawImage(cover, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
      // scrim so the type stays readable over any artwork
      const scrim = ctx.createLinearGradient(0, H * 0.25, 0, H);
      scrim.addColorStop(0, "rgba(8,7,12,0)");
      scrim.addColorStop(1, "rgba(8,7,12,0.92)");
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, W, H);
    } else {
      // faint blueprint grid while there is no artwork
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }
    }

    // accent bar down the left edge, like the rarity tab on the paper cards
    ctx.fillStyle = options.accent;
    ctx.fillRect(0, 0, 6, H);

    // tournament eyebrow
    ctx.font = "600 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = options.accent;
    ctx.textBaseline = "top";
    ctx.fillText("DAILY TOURNAMENT", 26, 24);

    ctx.font = "500 16px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(options.metric.toUpperCase(), 26, 52);

    // title
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 54px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    ctx.fillText(trim(ctx, options.title, W - 220), 26, H - 74);
    ctx.shadowBlur = 0;

    // maker
    ctx.font = "400 20px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.fillText(`by ${options.by}`, 26, H - 40);

    // enter pill
    const label = "ENTER";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    const tw = ctx.measureText(label).width;
    const pw = tw + 40;
    const ph = 38;
    const px = W - pw - 24;
    const py = H - 62;
    ctx.fillStyle = options.accent;
    roundRect(ctx, px, py, pw, ph, 19);
    ctx.fill();
    ctx.fillStyle = "#08070c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + pw / 2, py + ph / 2 + 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    texture.needsUpdate = true;
  };

  paint();

  return {
    texture,
    setCover(image) {
      cover = image;
      paint();
    },
    dispose() {
      texture.dispose();
    },
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function trim(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Loads a card cover without tainting the canvas; null on any failure. */
export function loadCover(
  url: string,
  onDone: (image: HTMLImageElement | null) => void,
) {
  if (!url || url.startsWith("/")) {
    onDone(null);
    return;
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.onload = () => onDone(image);
  image.onerror = () => onDone(null);
  image.src = url;
}
