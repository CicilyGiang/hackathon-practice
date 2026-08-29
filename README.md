# Sidequest Campus Events

Sidequest is a campus social-discovery prototype that helps students find events, join anonymous crews, connect through trusted circles, and use timetable gaps for low-pressure meetups.

The application uses:

- Vinext/Next.js, React and TypeScript for the web application.
- Leaflet and OpenStreetMap for campus maps.
- PostgreSQL for account registration, login and server-side sessions.
- Browser `localStorage` for hackathon-only social and preference state that has not yet been connected to the database.

## Current features

- University event discovery, filtering and weekly calendar.
- AI-generated recommendation explanations with a heuristic fallback.
- Anonymous event crews and crew messaging.
- Student and club-organizer profiles.
- PostgreSQL registration, login and session cookies.
- Trusted-friend and shared-club hangout map.
- Time-limited “Free to hang out” status.
- Private class schedule and verified-gap suggestions.
- Quests, rewards and premium prototype tools.
- Language exchange and direct messaging prototypes.

## Requirements

- Node.js `22.13.0` or later.
- npm.
- A fresh PostgreSQL database for authentication.

Check the local tools with:

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

The development server also listens on the local network so the responsive interface can be tested on a phone connected to the same Wi-Fi.

## PostgreSQL setup

PostgreSQL is required for registration and login. Without it, the signup form displays:

```text
Database connection is not configured.
```

### 1. Create a fresh database

Use a new database dedicated to Sidequest. The schema file contains destructive `DROP TABLE` statements and must not be run against a database containing valuable or unrelated data.

### 2. Apply the schema

Run the complete schema from:

```text
database/hackthon.sql
```

This can be executed using a PostgreSQL provider’s SQL editor or the `psql` command-line client.

Example for a new local database:

```bash
psql "postgresql://USERNAME:PASSWORD@127.0.0.1:5432/sidequest" -f database/hackthon.sql
```

The application expects the tables and functions created by this script, including:

- `users`
- `user_social_profiles`
- `user_sessions`
- `register_user(...)`
- `authenticate_user(...)`

### 3. Configure local environment variables

Create an ignored file named `.dev.vars` in the repository root:

```text
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL=require
```

For a local PostgreSQL server that does not use TLS:

```text
DATABASE_URL=postgresql://USERNAME:PASSWORD@127.0.0.1:5432/sidequest
DATABASE_SSL=disable
```

Restart the development server after creating or changing `.dev.vars`:

```bash
npm run dev
```

Never commit `.dev.vars`, database passwords, API keys or connection strings. Local environment files are excluded by `.gitignore`.

## Account rules

The current registration route accepts University of Sydney student email addresses ending in:

```text
@uni.sydney.edu.au
```

Passwords must contain at least eight characters, including an uppercase letter, a lowercase letter and a number.

Registration and login are stored in PostgreSQL. After successful authentication, the app also stores a display profile in the current browser for the hackathon demo.

## AI recommendations (optional)

`app/api/recommend/route.ts` can use the Anthropic Messages API to generate personalized recommendation text and match scores. This integration is optional; without an API key, the route falls back to a local heuristic.

To enable it locally, add the key to `.dev.vars`:

```text
ANTHROPIC_API_KEY=replace_with_your_key
```

For a deployed Cloudflare Worker, store it as a secret:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Do not commit the key.

## Data-storage status

The following data is currently backed by PostgreSQL:

- Account registration.
- Password verification.
- Login sessions.
- Core account and social-profile records created during registration.

Several hackathon prototype features still use browser `localStorage`, including event crews, chat demonstrations, saved events, timetable entries, hangout state, quest state and UI preferences. This data does not sync between browsers or devices.

The SQL schema contains production-oriented tables for more features, but those tables are not yet connected to every interface.

## Project structure

```text
app/                 Pages, components, API routes and styles
lib/                 Database, authentication and client-state helpers
types/               Shared TypeScript types
database/            PostgreSQL schema and seed SQL
package.json         Scripts and dependencies
vite.config.ts       Vinext, Vite and Cloudflare configuration
```

## Commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Start the production build
```

The repository currently defines an npm lint command, but ESLint 9 also requires an `eslint.config.js` file. Until that configuration is added, `npm run lint` will report that no ESLint configuration was found.

## Troubleshooting

### `npm` is not recognized

Install the current Node.js LTS release, close VS Code completely, reopen it, and confirm:

```bash
node --version
npm --version
```

### Database connection is not configured

Confirm that `.dev.vars` exists in the repository root, contains `DATABASE_URL`, and that the development server was restarted after the file was created.

### Account creation failed

Check that:

1. The database is reachable.
2. `DATABASE_SSL` matches the database provider.
3. The complete `database/hackthon.sql` schema was applied.
4. The email ends in `@uni.sydney.edu.au`.
5. The password satisfies the password rules.

### Local demo data is missing on another device

Most social prototype state is still stored in browser `localStorage`. Use the same browser and device for a consistent hackathon demonstration.

## Generated files

The following directories are generated and can be recreated:

```text
node_modules/
dist/
.next/
.vinext/
.wrangler/
```
