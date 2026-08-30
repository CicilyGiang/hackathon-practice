# Team Database Setup

This project uses one PostgreSQL login named `sidequest_team`. Each teammate keeps an individual local `.env` file, but all of those files may point to the same database server.

## Security rules

- Never commit `.env`, a real database password, or a production connection string.
- Share the password through a password manager or another private channel, not GitHub or group chat.
- The SQL schema stores the database login as a PostgreSQL SCRAM-SHA-256 verifier rather than plaintext.
- The current temporary password is weak and should be replaced before deployment.
- Only teammates connected to the approved Tailscale network should be allowed to reach PostgreSQL.

## Database owner: one-time setup

Run the schema from the project directory on the Mac that hosts PostgreSQL:

```bash
cd "/Users/lihuaduo/Desktop/hackathon-practice-latest"
psql -U lihuaduo -d sidequest -f database/hackthon.sql
```

Find the host Mac's Tailscale IPv4 address:

```bash
tailscale ip -4
```

PostgreSQL must listen on the Tailscale interface, and `pg_hba.conf` must allow only the required Tailscale users or subnet. Restart PostgreSQL after changing its server configuration. Do not expose port `5432` directly to the public internet.

## Every teammate: create the local environment file

Open the cloned project:

```bash
cd "/path/to/hackathon-practice-latest"
cp .env.example .env
```

Edit `.env` and replace both placeholders:

```env
DATABASE_URL=postgresql://sidequest_team:YOUR_URL_ENCODED_PASSWORD@YOUR_TAILSCALE_IP:5432/sidequest
DATABASE_SSL=disable
```

`YOUR_TAILSCALE_IP` is the database host Mac's Tailscale IPv4 address, not the teammate's own address.

If the password contains reserved URL characters such as `@`, `:`, `/`, `#`, `%`, or `?`, URL-encode it before putting it in `DATABASE_URL`.

## Test the shared connection

Make sure Tailscale is connected, then run:

```bash
psql "postgresql://sidequest_team:YOUR_URL_ENCODED_PASSWORD@YOUR_TAILSCALE_IP:5432/sidequest"
```

Inside `psql`, verify the active account and database:

```sql
SELECT current_user, current_database();
\dt
```

Exit with:

```text
\q
```

## Start the website

Restart the development server after creating or changing `.env`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Common errors

- `database connection is not configured`: `.env` is missing, has the wrong filename, or the development server was not restarted.
- `password authentication failed`: the password is wrong or was not URL-encoded correctly.
- `connection refused`: PostgreSQL is stopped or is not listening on the Tailscale interface.
- `timeout`: Tailscale, firewall rules, `listen_addresses`, or `pg_hba.conf` is blocking the connection.
- `permission denied`: `sidequest_team` does not have the required membership or object permissions; rerun the latest SQL schema as the database owner.
