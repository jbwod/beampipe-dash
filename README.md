# beampipe-dash

An operator-focused web interface for Beampipe v2. The dashboard is a separate process and repository; Beampipe remains the source of truth for users, project revisions, sources, jobs, executions, artifacts, and deployment profiles.

## Local start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. Set `BEAMPIPE_API_URL` to the URL the Next.js server can use to reach Beampipe.

The browser talks only to this dashboard. The server-side proxy stores Beampipe access and refresh tokens in HttpOnly cookies and forwards requests to `/api/v2`.

See [docs/architecture.md](docs/architecture.md) for the feature and security plan.
