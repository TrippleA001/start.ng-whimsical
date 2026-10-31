# start.ng-whimsical

A playful paper-and-neon concept for start.ng. The catalogue stays start.ng paper; selecting a category tears a neon vortex you fall into, landing on an orbit of playable game cards. One whimsical element, not a redesign.

## The element: the dive

Press a category chip → a lime-rimmed hole opens at the click point → paper burns away → you fall through a neon tunnel lined with that category's games → the tunnel brakes into a slow orbit of cards → hover a card, its preview plays → click, and the game loads in an in-page overlay player. Exit returns the card to its exact orbit slot.

## Structure

| Path | Holds |
| --- | --- |
| `src/app/page.tsx` | Catalogue root |
| `src/app/c/[category]/page.tsx` | Category route |
| `src/app/play/[slug]/page.tsx` | In-page game player route |
| `src/components/arcade.tsx` | Persistent shell above every route |
| `src/components/vortex-canvas.tsx` | WebGL neon dive tunnel |
| `src/components/tunnel-canvas.tsx` | Tunnel wall and streak renderer |
| `src/components/orbit.tsx` | Card ring that brakes after the dive |
| `src/components/game-card.tsx` | Preview, tilt, play-state card |
| `src/components/player.tsx` | Overlay iframe player |
| `src/components/catalogue.tsx` | Shelf + A-Z + category grid |
| `src/lib/games.ts` | 188 community games, synced from start.ng |
| `src/lib/previews.ts` | Preview manifest schema |
| `src/lib/sound.ts` | Generative hover/launch/whoosh cues |
| `scripts/sync-startng.mjs` | Catalogue fetcher |

## Tech

- Next.js 16, React 19, TypeScript strict
- Hand-written WebGL (no three.js), no UI framework
- pnpm, Vercel deployment

## Running

```sh
pnpm install
pnpm dev        # http://localhost:3001
pnpm build      # production build
pnpm typecheck  # tsc --noEmit
```

## License

MIT. The start.ng brand, copy, and game covers belong to start.ng and are used here as part of an unaffiliated concept prototype.
