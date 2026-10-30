"use client";

/** The three homepage shelves, in start.ng's own voice and grid. */

import GameCard from "~/components/game-card";
import { GAMES, SHELVES } from "~/lib/games";

const RARITY = [
  "r-legendary",
  "r-rare",
  "r-rare",
  "r-epic",
  "r-epic",
  "r-uncommon",
  "r-uncommon",
  "r-common",
  "r-common",
  "r-common",
];

export default function Shelves() {
  const bySlug = new Map(GAMES.map((game) => [game.slug, game]));

  return (
    <>
      {SHELVES.map((shelf) => {
        const games = shelf.slugs
          .map((slug) => bySlug.get(slug))
          .filter((game): game is NonNullable<typeof game> => Boolean(game));

        if (!games.length) return null;

        return (
          <section className="shelf" key={shelf.key}>
            <h2>
              {shelf.title}
              <span className="count">{shelf.note}</span>
            </h2>
            <ul>
              {games.map((game, index) => (
                <li key={game.slug}>
                  <GameCard game={game} rarity={RARITY[index] ?? "r-common"} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
