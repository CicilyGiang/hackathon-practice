# Sidequest Campus Events

A Vinext/Next.js campus discovery prototype with event matching, anonymous crews, local profile storage, and group chat interactions.

## Start locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Project structure

```text
app/                 Pages, layout, and global styles
lib/                 Client-side social-state helpers
types/               Shared TypeScript types
database/            PostgreSQL schema and seed SQL
package.json         Scripts and dependencies
vite.config.ts       Vinext and Cloudflare local configuration
```

Generated folders such as `node_modules`, `dist`, `.next`, `.vinext`, and `.wrangler` are ignored and can be recreated.
