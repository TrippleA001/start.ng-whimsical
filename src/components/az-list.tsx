"use client";

/**
 * The A→Z list, exactly as start.ng prints it — except the link opens the
 * in-page player instead of navigating away. `href` stays real so middle
 * click, copy link and no-JS all still work.
 */

import { useArcade } from "~/components/arcade";
import type { Game } from "~/lib/games";

export default function AzList({ games }: { games: Game[] }) {
  const { launch, preconnect } = useArcade();

  return (
    <ul>
      {games.map((game) => {
        const href = `/play/${game.slug}`;
        return (
          <li key={game.slug}>
            <a
              href={href}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                event.preventDefault();
                try {
                  preconnect(new URL(game.url).origin);
                } catch {
                  /* malformed url — nothing to warm */
                }
                const rect = event.currentTarget.getBoundingClientRect();
                launch(game.slug, {
                  x: rect.left,
                  y: rect.top,
                  w: Math.max(rect.width, 40),
                  h: 24,
                });
              }}
            >
              {game.title}
            </a>{" "}
            <span>by {game.by}</span>
          </li>
        );
      })}
    </ul>
  );
}
