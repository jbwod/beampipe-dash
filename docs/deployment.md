# Deployment and security

## Runtime model

The dashboard needs only Node.js and network access to Beampipe. It does not need PostgreSQL, CASDA credentials, SSH keys, or access to worker filesystems.

```text
browser --HTTPS--> dashboard --private HTTP/HTTPS--> Beampipe API
```

## Bare-metal process

Build once, then run the production server:

```bash
npm ci
npm run build
BEAMPIPE_API_URL=http://127.0.0.1:18080 \
BEAMPIPE_DASH_SECURE_COOKIES=false \
npm start
```

For a service manager, set `NODE_ENV=production`, `PORT`, `BEAMPIPE_API_URL`, and the secure-cookie policy in the service environment. Run as a dedicated unprivileged user.

## Docker Compose

```bash
./scripts/install.sh --core-home ~/beampipe
docker compose ps
```

The installer writes `compose.beampipe-local.yml` so Dash joins Core's Compose network (`http://api:8080`) and publishes the UI on `127.0.0.1:3000`. Without that overlay, base `compose.yaml` uses `host.docker.internal` and the host API port (operator default **18080**).

The dashboard image runs as UID/GID `1001`, uses Next.js standalone output, and exposes a container health check at `/api/health`.

## Configuration

| Variable | Timing | Purpose |
|---|---|---|
| `BEAMPIPE_API_URL` | runtime | Beampipe base URL reachable by the dashboard server |
| `BEAMPIPE_DASH_SECURE_COOKIES` | runtime | Set `true` when the browser uses HTTPS |
| `PORT` | runtime | Dashboard listen port inside a bare-metal process |
| `NEXT_PUBLIC_EAGLE_URL` | build | Public EAGLE editor base URL |

`BEAMPIPE_API_URL` is never exposed to browser JavaScript. Do not put credentials in it.

## Reverse proxy

Terminate TLS in a trusted reverse proxy and forward all paths to the dashboard, including `/api/*`. The proxy must overwrite forwarded authority headers rather than append untrusted client values.

Example NGINX location:

```nginx
location / {
    proxy_pass http://beampipe-dash:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Set:

```text
BEAMPIPE_DASH_SECURE_COOKIES=true
```

Do not publish Beampipe's API to end-user browsers when the dashboard can reach it over a private network.

## Session security

- Access and refresh tokens are Secure/HttpOnly/SameSite cookies.
- Refresh tokens rotate through the Beampipe `/refresh` endpoint.
- Client JavaScript cannot read or write tokens.
- Cross-site mutation requests are rejected using fetch metadata and origin/authority checks.
- The BFF strips inbound authorization headers and adds its own bearer token.
- Upstream error bodies pass through Beampipe's redaction policy.

## SSH and secrets

Deployment profiles contain targets, resource policy, remote paths, and runtime commands. They do not contain SSH private keys or passphrases.

Configure SSH credentials on the Beampipe process using its external secret model, for example:

```text
SLURM_SSH_PRIVATE_KEY_FILE=/run/secrets/slurm_private_key
SLURM_SSH_KNOWN_HOSTS_FILE=/run/secrets/slurm_known_hosts
SLURM_SSH_KEY_PASSPHRASE_FILE=/run/secrets/slurm_passphrase
```

Run `beampipe security check` and `beampipe doctor --profile <name>` before using **Test** in the dashboard. The profile screen reports only configured/readiness metadata.

CASDA passwords, JWT secrets, SMTP credentials, webhook headers, and routing keys likewise belong to Beampipe, not the dashboard.

## Health and troubleshooting

| Endpoint | Meaning |
|---|---|
| `/api/health` | Dashboard process is serving requests |
| `/api/connection` | Dashboard server can reach Beampipe health |
| Beampipe `/api/v2/ready` | Database, queue, TAP, and runtime readiness shown in **System** |

After an upgrade:

```bash
npm ci
npm run build
npm start
```

The dashboard has no migration step or persistent volume.
