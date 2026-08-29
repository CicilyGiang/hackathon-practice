# Sidequest Campus Events

A Vinext/Next.js campus discovery prototype with event matching, anonymous crews, local profile storage, and group and direct chat interactions. Signup supports USYD students and club organizers and accepts only addresses ending in `@uni.sydney.edu.au`. Students can publish informal meetups, while organizers publish under their club name with an official badge and capacity control. The Messages tab lists every joined crew group, offers direct anonymous chats with crew members, and supports silent group leaving without posting a departure event. The Language Exchange tab creates anonymous reciprocal language matches and local conversations for English, Mandarin, Indonesian, Vietnamese, and other languages. The profile menu includes a saved-event shortcut, and responsive mobile layouts retain access to every major tab through a fixed bottom navigation. All demo profile, role, language, membership, preference, and message data stays in the browser's local storage; signing out removes Sidequest's account-related local keys from that device.

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
