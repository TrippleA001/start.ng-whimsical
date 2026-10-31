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

  const handleClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
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

  const handleMouseEnter = (event: React.MouseEvent) => {
    shakeCard(event.currentTarget);
    preconnect(host);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    event.currentTarget.classList.remove("shake");
  };

  return (
    <button
      type="button"
      data-slug={game.slug}
      className={`game ${rarity} ${dissolving ? "dissolve" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Play ${game.title} by ${game.by}`}
    >
      <span className="art">
        {hasCover ? (
          <img src={game.cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <span aria-hidden>{game.title.slice(0, 1).toUpperCase()}</span>
        )}
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
