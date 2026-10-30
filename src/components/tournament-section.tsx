"use client";

/**
 * The Tournament section of the home page.
 *
 * The markup is start.ng's own tournament markup — section head, status
 * panel, five games, standings and past winners. `TournamentCanvas` paints a
 * WebGL layer on top of the five cards; until it has proved it can render,
 * the cards below look and behave exactly like every other card on the site.
 */

import { useCallback } from "react";
import TournamentCanvas from "./tournament/TournamentCanvas";
import { useArcade } from "~/components/arcade";
import { RECENT_TOURNAMENTS, TOURNAMENT, gameFor } from "~/lib/games";

const POINTS = "1st on a game gets 10 points, 2nd 7, 3rd 5, 4th 3, and everyone else who plays it 1. Most points wins the day.";

const DOT_COLOURS = [
  "#1dd1a1",
  "#346fdf",
  "#db2967",
  "#f5a640",
  "#8e4fd6",
  "#278546",
  "#75766c",
];

export default function TournamentSection() {
  const { launch, preconnect } = useArcade();
  const games = TOURNAMENT.games;

  const open = useCallback(
    (slug: string, href: string, event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      const game = gameFor(slug);
      if (!game) return;
      event.preventDefault();
      try {
        preconnect(new URL(game.url).origin);
      } catch {
        /* malformed url — nothing to warm */
      }
      const rect = event.currentTarget.getBoundingClientRect();
      launch(slug, {
        x: rect.left,
        y: rect.top,
        w: Math.max(rect.width, 40),
        h: Math.max(rect.height, 40),
      });
      void href;
    },
    [launch, preconnect],
  );

  const winners = RECENT_TOURNAMENTS.filter((t) => t.winner);

  return (
    <div className="tournament-stage" data-tournament>
      <section className="container tournament-page">
        <div className="section-head">
          <div>
            <h2>Today&rsquo;s tournament</h2>
            <p className="tournament-sub">
              A few games, 24 hours, one winner.{" "}
              <a href="https://start.ng/leaderboard">Overall leaderboard →</a>
            </p>
          </div>
        </div>

        <div className="tournament-status">
          <div>
            <p>
              Ends at <b>6:00 PM</b> Nigeria time.{" "}
              {games.reduce((total, game) => total + game.players, 0)} players
              have entered.
            </p>
            <p className="note">{POINTS}</p>
          </div>
          <div className="tournament-enter">
            <p className="note">
              Share the tournament on X to enter. Runs before you enter don&rsquo;t
              count.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => window.open("https://start.ng/tournament", "_blank", "noopener")}
            >
              Enter on start.ng
            </button>
          </div>
        </div>

        <div className="grid tournament-games">
          {games.map((game) => (
            <article
              className="game"
              key={game.slug}
              data-tcard
              data-slug={game.slug}
            >
              <a
                className="game-link"
                href={`/play/${game.slug}`}
                onClick={(event) => open(game.slug, `/play/${game.slug}`, event)}
                onMouseEnter={() => {
                  try {
                    preconnect(new URL(game.url).origin);
                  } catch {
                    /* malformed url — nothing to warm */
                  }
                }}
              >
                <div className="art">
                  {game.cover.startsWith("/") ? (
                    <span aria-hidden>{game.title.slice(0, 1).toUpperCase()}</span>
                  ) : (
                    <img src={game.cover} alt="" loading="lazy" decoding="async" />
                  )}
                </div>
                <div className="info">
                  <h3>{game.title}</h3>
                  <p>
                    {game.players} player{game.players === 1 ? "" : "s"}
                  </p>
                </div>
              </a>
              <ol className="tournament-top">
                <li className="none">No runs yet. Be the first.</li>
              </ol>
              <div className="meta">
                <a
                  className="play"
                  href={game.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Play ↗
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="tournament-columns">
          <section aria-labelledby="standings-heading">
            <h2 id="standings-heading">Standings</h2>
            <p className="board-empty">
              No points yet. Enter, play, and you&rsquo;ll show up here.
            </p>
          </section>
          <section aria-labelledby="winners-heading">
            <h2 id="winners-heading">Past winners</h2>
            <ul className="winners">
              {winners.length ? (
                winners.map((tournament, index) => (
                  <li key={tournament.id}>
                    <span
                      className="dot"
                      style={{
                        background: DOT_COLOURS[index % DOT_COLOURS.length],
                      }}
                      aria-hidden
                    />
                    <span className="nm">{tournament.winner}</span>
                    <span className="sc">{tournament.points} pts</span>
                  </li>
                ))
              ) : (
                <li className="none">Nobody has taken the day yet.</li>
              )}
            </ul>
          </section>
        </div>
      </section>

      <TournamentCanvas cards={games.map((game) => ({ ...game }))} />
    </div>
  );
}
