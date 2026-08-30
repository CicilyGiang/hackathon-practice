# Sidequest Campus Events

Sidequest is a campus social-discovery prototype that helps students find events, join anonymous crews, connect through trusted circles, and use timetable gaps for low-pressure meetups.

## Current features

- Interactive campus event map and weekly calendar.
- Explainable event recommendations with an optional AI integration.
- Anonymous event crews, group conversations and direct-message prototypes.
- Student and club-organizer profiles.
- Local signup and login for immediate prototype access.
- Trusted-friend and shared-club hangout map.
- Time-limited “Free to hang out” status using approximate public meetup areas.
- Private class schedule and verified-gap suggestions.
- Social quests, rewards and premium prototype tools.
- Language exchange and cross-cultural connection features.

## Technology

- React and TypeScript.
- Vinext, Vite and Next.js-compatible routing.
- Leaflet and OpenStreetMap.
- Browser `localStorage` for prototype accounts and social state.
- Optional PostgreSQL backend code for future shared authentication.

## Requirements

- Node.js `22.13.0` or later.
- npm.

Check the installed versions:

```bash
node --version
npm --version
```

## Install and run

From the repository directory:

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

No PostgreSQL database, Tailscale connection or environment file is required for the default hackathon prototype.

The development server listens on the local network, allowing the responsive interface to be tested on a phone connected to the same Wi-Fi.

## Accessing Sidequest

Sidequest is currently a local hackathon prototype. A public hosted version is not included in this repository.

The project video demonstrates the complete experience. Anyone who wants to run the source code can use the installation commands above.

## Local account behavior

The current signup and login flow runs entirely in the browser:

- Creating a profile saves the account and profile to `localStorage`.
- Login checks the account previously created in the same browser.
- Refreshing the page preserves the local profile.
- Signing out removes the locally stored account-related data.
- Accounts do not sync between browsers, devices or computers.

Registration accepts University of Sydney student addresses ending in:

```text
@uni.sydney.edu.au
```

Passwords must contain at least eight characters, including an uppercase letter, a lowercase letter and a number.

This authentication flow is designed only for a hackathon prototype. Credentials stored in browser storage are not suitable for production. A production version should use server-side authentication, secure password hashing and a shared database.

## Optional PostgreSQL backend

The repository retains PostgreSQL schema and API routes for future server-backed authentication, but the current user interface does not require or call that backend for signup and login.

Team members who intentionally want to reconnect the PostgreSQL version can follow:

```text
TEAM_DATABASE_SETUP.md
```

The main schema is located at:

```text
database/hackthon.sql
```

The schema contains destructive `DROP TABLE` statements. Run it only on a new database dedicated to Sidequest, never on a database containing valuable or unrelated data.

Do not commit `.env`, database credentials, API keys or private connection strings.

## AI recommendations (optional)

`app/api/recommend/route.ts` can use the Anthropic Messages API to generate personalized event explanations and match scores. Without an API key, it falls back to local heuristic recommendations, so the core experience remains available.

To enable the API locally, create an ignored `.env` file:

```text
ANTHROPIC_API_KEY=replace_with_your_key
```

For a deployed Cloudflare Worker, store the value as a secret:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Never commit an API key.

## Data-storage status

The current prototype stores the following data in the browser:

- Local account and profile.
- Saved and custom events.
- Event crews and demonstration messages.
- Friends, direct messages and language-exchange state.
- Class schedule and hangout availability.
- Quest, reward and interface preferences.

Because this data uses `localStorage`, it is specific to the current browser and does not synchronize across devices.

## Project structure

```text
app/                 Pages, components, API routes and styles
lib/                 Client-state, optional database and authentication helpers
types/               Shared TypeScript types
database/            Optional PostgreSQL schema
package.json         Scripts and dependencies
vite.config.ts       Vinext, Vite and Cloudflare configuration
```

## Commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Start the production build
```

The repository currently defines an npm lint command, but ESLint 9 also requires an `eslint.config.js` file. Until that configuration is added, `npm run lint` reports that no ESLint configuration was found.

## Troubleshooting

### `npm` is not recognized

Install the current Node.js LTS release, close VS Code completely, reopen it, and verify:

```bash
node --version
npm --version
```

### Login says the email or password is invalid

Create an account through **Create your profile** in the same browser first. Local accounts are not shared between browsers or devices.

### Profile or demo data disappeared

Check whether the browser's site data was cleared or whether the application was opened in a different browser or private window.

### Another computer cannot see the same account

This is expected in the current prototype because account data is stored locally. Create a separate local profile on that computer.

## Generated files

The following directories are generated and can be recreated:

```text
node_modules/
dist/
.next/
.vinext/
.wrangler/
```
