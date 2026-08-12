# Development and browser checks

## Static and unit checks

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Unit tests cover the BFF origin policy, Beampipe URL handling, Prometheus parsing, EAGLE links, project-draft round trips, and deployment-profile validation.

## Reproducible browser fixture

The checked-in mock binds only to `127.0.0.1:18080` and contains fake project, profile, source, run, worker, metric, and artifact data.

Terminal 1:

```bash
npm run mock:api
```

Terminal 2:

```bash
BEAMPIPE_API_URL=http://127.0.0.1:18080 \
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Terminal 3:

```bash
BEAMPIPE_DASH_URL=http://127.0.0.1:3100 npm run visual:check

export BEAMPIPE_DASH_E2E_CONFIRM_MUTATIONS=1
npm run studio:check
npm run profiles:check
npm run sources:check
npm run composer:check
```

The mutation flag is mandatory. Do not enable it while the dashboard points to a production Beampipe instance.

Screenshots are written to `/private/tmp` by default. Override with `BEAMPIPE_DASH_SCREENSHOT_DIR`.

The scripts use system Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` by default. Set `CHROME_PATH` on another platform.

## Browser coverage

- all primary routes at `1440x1000` and `390x844`;
- page-level horizontal overflow checks;
- project visual/YAML round trip, query insertion, EAGLE link, and version save;
- REST/Slurm profile revisions, connectivity, resources, and SSH posture;
- source registration, selected discovery, workflow admission, metadata, and policy;
- valid and blocked execution preparation, profile pinning, creation, and start.
