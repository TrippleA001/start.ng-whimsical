import { CATEGORIES, GAMES, gamesIn } from "~/lib/games";
import CategoryChip from "~/components/category-chip";
import Shelves from "~/components/shelves";
import AzList from "~/components/az-list";
import TournamentSection from "~/components/tournament-section";

/**
 * The catalogue is start.ng's homepage, copied rather than reinterpreted —
 * same sections, same copy, same stylesheet. The single difference is the
 * category row: press one and the page tears open.
 */

const HOW = [
  {
    b: "Build it",
    s: "Any static browser game: HTML, JavaScript, three.js, Phaser. Players bring their start.ng character, scores and friends.",
  },
  {
    b: "Push it to GitHub",
    s: "A public repo with a ready-to-play index.html at the top or in dist/, plus a cover.png for its card.",
  },
  {
    b: "Publish it",
    s: "One API call with your repo link, no key needed. Or hand your AI start.ng/docs and let it do the lot.",
  },
  {
    b: "Approve it once",
    s: "Open the link you get back and it's live at yourgame.start.ng, with its own leaderboard if you want one. After that, every push updates it.",
  },
];

const FAQ = [
  [
    "What is start.ng?",
    "A home for free browser games made by the HNG community. Each game has its own address, like yourgame.start.ng, and you play it right in your browser.",
  ],
  [
    "Is it free?",
    "Yes. Every game on start.ng is free to play in your browser, with nothing to download.",
  ],
  [
    "Are there Nigerian or African web games?",
    "Yes. Many games here are Naija-themed, from danfo rush hour to jollof and Lagos markets, and we welcome games from across Africa.",
  ],
  [
    "Do I need an account to play?",
    "No. Sign in to get your start.ng character, keep your scores on the leaderboards and join the daily tournament.",
  ],
  [
    "What is the daily tournament?",
    "Every day a few start.ng games are picked for 24 hours, and the best player wins. Points count towards the overall leaderboard.",
  ],
  [
    "How do I put my game on start.ng?",
    "Push your browser game to a public GitHub repo, publish it with one API call and approve it once. It goes live at yourgame.start.ng. The docs have every step.",
  ],
];

export default function Catalogue() {
  return (
    <>
      <header className="container nav">
        <a className="logo" href="/">
          <b>
            start<span>.ng</span>
          </b>
        </a>
        <nav aria-label="Pages">
          <a href="#games">Games</a>
          <a href="https://start.ng/tournament">Tournament</a>
          <a href="https://start.ng/creators">Creators</a>
          <a href="https://start.ng/docs">Docs</a>
        </nav>
      </header>

      <main>
        <section className="container hero">
          <p className="eyebrow">Big imagination. Played everywhere.</p>
          <h1>
            Good vibes.
            <br />
            <mark>Good games.</mark>
          </h1>
          <p className="lead">
            Games made by builders in the community. Each one lives at its own
            start.ng address. Pick one and play right in your browser.
          </p>
          <div className="actions">
            <a className="btn" href="#games">
              Play now
            </a>
          </div>
        </section>

        <section id="games" className="container">
          <div className="section-head">
            <div>
              <h2>Games from the community</h2>
            </div>
          </div>

          <p className="dive-hint">Pick a category — the page tears open</p>
          <div className="chips dive-chips">
            {CATEGORIES.map((category) => (
              <CategoryChip
                key={category.key}
                category={category}
                count={gamesIn(category.key).length}
              />
            ))}
          </div>

          <Shelves />

          <div className="see-all">
            <a className="btn" href="#az">
              See all {GAMES.length} games →
            </a>
          </div>

          <TournamentSection />

          <details className="az-games" id="az">
            <summary>Every game on start.ng, A to Z ({GAMES.length})</summary>
            <AzList games={GAMES} />
          </details>
        </section>

        <section id="how" className="container how">
          <h2>Got a game? Put it on start.ng</h2>
          <ol>
            {HOW.map((step) => (
              <li key={step.b}>
                <b>{step.b}</b>
                <span>{step.s}</span>
              </li>
            ))}
          </ol>
          <div className="how-actions">
            <a className="btn" href="https://start.ng/docs">
              Read the docs
            </a>
            <a className="btn ghost" href="https://start.ng/docs.md">
              Docs for your AI (.md)
            </a>
          </div>
        </section>

        <section id="about" className="container about">
          <h2>About start.ng</h2>
          <p>
            start.ng is Nigeria&#x27;s home for browser games, built by the HNG
            community. Every game is free to play in your browser with no
            download, and many are made in Naija: danfo rush hour, jollof
            catching, Lagos markets and more.
          </p>
          <p>
            We&#x27;re also building a home for web games from across Africa. If
            you make games anywhere on the continent, you can put yours on
            start.ng for free.
          </p>
          <p>
            <a href="https://start.ng/about">More about start.ng →</a>
          </p>

          <h3>Questions</h3>
          <div className="faq">
            {FAQ.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="container site-footer">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <a className="logo" href="/">
              <b>
                start<span>.ng</span>
              </b>
            </a>
            <p>
              Nigeria&#x27;s home for browser games, made by the community and
              by creators across Africa.
            </p>
          </div>
          <nav aria-label="Play">
            <h2>Play</h2>
            <ul>
              <li>
                <a href="#games">All games</a>
              </li>
              <li>
                <a href="https://start.ng/tournament">Daily tournament</a>
              </li>
              <li>
                <a href="https://start.ng/leaderboard">Leaderboard</a>
              </li>
              <li>
                <a href="https://start.ng/categories">Categories</a>
              </li>
              <li>
                <a href="https://start.ng/hangout">The Hangout</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Make games">
            <h2>Make games</h2>
            <ul>
              <li>
                <a href="https://start.ng/creators">Independent creators</a>
              </li>
              <li>
                <a href="https://start.ng/docs">Build a game</a>
              </li>
              <li>
                <a href="https://start.ng/docs.md">Docs for your AI (.md)</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="About">
            <h2>About</h2>
            <ul>
              <li>
                <a href="https://start.ng/about">About start.ng</a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="site-footer-base">
          <span>© 2026 start.ng</span>
          <span>Games from Nigeria and across Africa.</span>
        </p>
      </footer>
    </>
  );
}
