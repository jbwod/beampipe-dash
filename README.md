<p align="center">
  <img src="https://raw.githubusercontent.com/jbwod/beampipe-core-v2/main/assets/brand/beampipe-terminal-logo.svg" alt="Beampipe" width="920">
</p>

<p align="center">
  <a href="https://github.com/jbwod/beampipe-dash/actions/workflows/quality.yml"><img src="https://github.com/jbwod/beampipe-dash/actions/workflows/quality.yml/badge.svg" alt="Dashboard quality"></a>
  <a href="https://beampipe.jackblackwood.com/getting-started/dashboard/"><img src="https://img.shields.io/badge/docs-operator_guide-7fd7e6?style=flat-square&labelColor=050505" alt="Operator documentation"></a>
  <a href="https://github.com/jbwod/beampipe-core-v2"><img src="https://img.shields.io/badge/Core-%2Fapi%2Fv2-d6c178?style=flat-square&labelColor=050505" alt="Beampipe Core API v2"></a>
</p>

# Beampipe Dash

Beampipe Dash is the optional Next.js operator console for
[Beampipe Core](https://github.com/jbwod/beampipe-core-v2). The browser talks
to Dash's same-origin BFF; Core remains authoritative for users, projects,
profiles, sources, jobs, workers, executions, artifacts, and secrets.

## Canonical documentation

Dashboard documentation is maintained with the hosted Core operator guide so
installation, API behavior, execution states, and UI procedures are versioned
together:

- [Dashboard tour](https://beampipe.jackblackwood.com/getting-started/dashboard/)
- [First operator workflow](https://beampipe.jackblackwood.com/operations/dashboard-workflow/)
- [Deployment and security](https://beampipe.jackblackwood.com/architecture/dashboard-deployment/)
- [Boundary and architecture](https://beampipe.jackblackwood.com/architecture/dashboard/)
- [Local DALiuGE qualification](https://beampipe.jackblackwood.com/getting-started/local-daliuge/)

This repository intentionally does not maintain a separate documentation tree.

## Install

Start Core, then use its installer:

```bash
beampipe setup --dashboard
```

The complete Compose, native-process, reverse-proxy, cookie, and health-check
procedures are in the
[deployment guide](https://beampipe.jackblackwood.com/architecture/dashboard-deployment/).

## Development

Use Node.js 24:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The mock API and browser-test procedures live in the Core
[contributing guide](https://beampipe.jackblackwood.com/contributing/#dashboard-checks).
