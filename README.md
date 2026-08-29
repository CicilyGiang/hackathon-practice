# Sidequest Campus Events

A Vinext/Next.js campus discovery prototype with event matching, anonymous crews, local profile storage, and group and direct chat interactions. Creating a local event automatically adds its creator to that event's community crew. All demo profile, membership, and message data stays in the browser's local storage.

## Start locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

### AI-generated recommendations (optional)

`app/api/recommend/route.ts` generates the "Why this one?" text and match
score per event via a plain `fetch()` call to the Anthropic Messages API
(no SDK, same pattern as the geocoding route). Without a key it silently
falls back to a heuristic score, so the app runs fine without it — but for
the live version, set a key locally and in production:

```bash
# .dev.vars (gitignored, read by `vinext dev` / wrangler locally)
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# for the deployed Worker
npx wrangler secret put ANTHROPIC_API_KEY
```

## Project structure

```text
app/                 Pages, layout, and global styles
lib/                 Client-side social-state helpers
types/               Shared TypeScript types
database/            PostgreSQL schema and seed SQL — see status note below
package.json         Scripts and dependencies
vite.config.ts       Vinext and Cloudflare local configuration
```

**Status note:** `database/hackthon.sql` is the target production schema and
is not wired up for the hackathon build — the running app persists
everything (profile, saved events, crews, chat, friends) to the browser's
`localStorage` instead. That's a deliberate scope call for the demo, not a
bug: it keeps the app deployable with zero backend setup. It does mean state
doesn't sync across devices/browsers, so plan the demo around a single
browser/profile.

Generated folders such as `node_modules`, `dist`, `.next`, `.vinext`, and `.wrangler` are ignored and can be recreated.
