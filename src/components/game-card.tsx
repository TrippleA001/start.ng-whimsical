"use client";

/** One card, drawn exactly as start.ng draws its cards. */

import { useArcade } from "~/components/arcade";
import type { Game } from "~/lib/games";

export default function GameCard({ game, rarity }: { game: Game; rarity: string }) {
  const { launch, preconnect } = useArcade();

  const hasCover = !game.cover.startsWith("/");
  const host = (() => {
    try {
      return new URL(game.url).host;
    } catch {
      return "start.ng";
    }
  })();

  return (
    <button
      type="button"
      className={`game ${rarity}`}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        launch(game.slug, {
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
        });
      }}
      onMouseEnter={() => preconnect(host)}
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
