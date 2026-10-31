"use client";

import { useState } from "react";

/** One card, drawn exactly as start.ng draws its cards. */

import { useArcade } from "~/components/arcade";
import type { Game } from "~/lib/games";
import { sound } from "~/lib/sound";

export default function GameCard({ game, rarity }: { game: Game; rarity: string }) {
  const { launch, preconnect } = useArcade();
  const [dissolving, setDissolving] = useState(false);

  const hasCover = !game.cover.startsWith("/");
  const host = (() => {
    try {
      return new URL(game.url).host;
    } catch {
      return "start.ng";
    }
  })();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    burstPaper(
      fromKeyboard ? rect.left + rect.width / 2 : event.clientX,
      fromKeyboard ? rect.top + rect.height / 2 : event.clientY,
    );
    sound.play("launch");
    setDissolving(true);
    /* hold the dissolve 420ms so the card stays gone while the player FLIPs
       in from its screen rect — no blank rectangle, no snap */
    window.setTimeout(() => {
      launch(game.slug, {
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      });
    }, 420);
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    shakeCard(event.currentTarget);
    preconnect(host);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    /* the eyes follow the pointer across the artwork */
    const art = event.currentTarget.querySelector(".art");
    if (!art) return;
    const r = art.getBoundingClientRect();
    const gx = ((event.clientX - r.left) / r.width - 0.5) * 4;
    const gy = ((event.clientY - r.top) / r.height - 0.5) * 4;
    event.currentTarget.style.setProperty("--gx", `${gx}px`);
    event.currentTarget.style.setProperty("--gy", `${gy}px`);
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.classList.remove("shake");
    event.currentTarget.style.setProperty("--gx", "0px");
    event.currentTarget.style.setProperty("--gy", "0px");
  };

  return (
    <button
      type="button"
      data-slug={game.slug}
      className={`game ${rarity} ${dissolving ? "dissolve" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={`Play ${game.title} by ${game.by}`}
    >
      <span className="art">
        {hasCover ? (
          <img src={game.cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <span aria-hidden>{game.title.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="googly" aria-hidden>
          <span className="googly__eye">
            <i />
          </span>
          <span className="googly__eye">
            <i />
          </span>
        </span>
      </span>
      <span className="info">
        <h3>{game.title}</h3>
        <span className="by">
          by {game.by} <span className="plays">{game.plays} plays</span>
        </span>
      </span>
    </button>
  );
}

/* hover shake — a quick left-right tug so the card feels loose */
function shakeCard(el: Element) {
  el.classList.add("shake");
  window.setTimeout(() => el.classList.remove("shake"), 320);
}

/* paper confetti — shards tear off the card and flutter down */
function burstPaper(x: number, y: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colours = ["#d8fd71", "#292a23", "#fffefa", "#ff7a59", "#7c5cff"];
  const count = 14;

  for (let i = 0; i < count; i++) {
    const shard = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const distance = 60 + Math.random() * 110;

    shard.className = "paper-shard";
    shard.style.setProperty("--x", `${x}px`);
    shard.style.setProperty("--y", `${y}px`);
    shard.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    shard.style.setProperty("--dy", `${Math.sin(angle) * distance - 50}px`);
    shard.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    shard.style.setProperty("--c", colours[i % colours.length]);
    shard.style.animationDelay = `${Math.random() * 50}ms`;

    document.body.appendChild(shard);
    window.setTimeout(() => shard.remove(), 1100);
  }
}
