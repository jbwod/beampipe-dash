# Dashboard architecture

## Product boundary

Beampipe Dash is an operator client, not a second control plane. It does not own a database and does not infer or rewrite ledger state. Every mutation maps to an authenticated Beampipe v2 API operation.

```text
browser -> dashboard BFF -> Beampipe /api/v2 -> PostgreSQL jobs + ledger
                                      |-------> TAP / TM / DIM / Slurm
```

## Runtime

- Next.js App Router and TypeScript.
- Server-side same-origin proxy to Beampipe.
- Access and rotating refresh tokens in Secure, HttpOnly, SameSite=Lax cookies.
- TanStack Query for bounded polling, cache invalidation, and mutation state.
- Tailwind CSS with a compact monochrome terminal visual system.
- Base UI primitives for focus-managed dialogs, menus, tabs, and selects.
- Zod validation at dashboard form and proxy boundaries.

## Information architecture

| Area | Operator question |
|---|---|
| Overview | Is the control plane healthy, and what needs attention now? |
| Runs | What is active, queued, failed, or complete? |
| Run detail | What happened, in what order, with which input and external identity? |
| Jobs | Is durable work queued, leased, delayed, or failing repeatedly? |
| Sources | Which sources are registered, discovered, ready, or pending? |
| Projects | Which immutable project revisions are active and valid? |
| Project studio | Can I author and validate project policy without hand-editing YAML? |
| Profiles | Which REST or Slurm infrastructure policy will a run pin? |
| Workers | Which capabilities and leases are currently available? |

## Project studio

The editor has a visual form on the left and YAML on the right. Both represent one parsed `ProjectConfig` document:

1. A visual edit updates the in-memory object and serializes deterministic YAML.
2. A YAML edit parses after a short idle period and updates the visual model only when valid.
3. Parse errors stay beside the YAML editor and never destroy the last valid visual model.
4. Validation uses Beampipe's project upload/validation contract before activation.
5. Saving creates a new immutable revision; it never mutates a prior revision.

## Security

- Tokens never enter browser storage or client-readable cookies.
- The generic proxy accepts only `/api/v2/*` paths and strips caller-supplied authentication headers.
- Mutations use same-origin cookies and reject cross-origin requests.
- Secret material is never added to project or deployment-profile forms.
- Slurm SSH settings describe targets and resources; key material remains mounted into Beampipe.
- Destructive or externally effective operations require confirmation and explain the durable state transition.

## Delivery slices

1. Foundation: session proxy, ASCII shell, navigation, error/loading patterns.
2. Monitoring: overview, workers, jobs, runs, projects, and sources.
3. Run explorer: timeline, ledger, artifacts, observations, graph/debug links, retry/cancel.
4. Project studio: visual/YAML editing, versions, validation, EAGLE links.
5. Deployment profiles: REST/Slurm authoring, validation, test/render, SSH readiness.
6. Workflow operations: source registration/discovery, graph preview, and execution admission.
7. Qualification: responsive browser tests, mocked API contract tests, deployment guide.
