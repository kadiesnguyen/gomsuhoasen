# GHCR + Dokploy deploy — Gốm Hoa Sen

**Date:** 2026-07-28  
**Status:** Approved (Cách 1 — 2 images + compose pull)

## Goal

Push production source to `kadiesnguyen/gomsuhoasen`, build Docker images on GitHub Actions → GHCR, Dokploy VPS pull-only via `compose.deploy`.

## Architecture

```text
push main
  → build-api, build-web → ghcr.io/kadiesnguyen/gomsuhoasen/{api,web}:latest|+sha
  → deploy → POST {DOKPLOY_URL}/api/compose.deploy
  → Dokploy pulls images, recreates containers
```

| Service | Image / role |
|---------|----------------|
| `mongo` | `mongo:7` single-node replica set `rs0` |
| `api` | NestJS on `:4000`, uploads volume |
| `web` | NGINX: showroom `/`, portal `/admin/`, proxy `/api`, `/uploads` |

## Non-goals

- Build on VPS
- Commit secrets (`info.md`, `.env`, SSL, DB dumps)
- Include `portal-e2e` in deploy path

## Secrets

| Location | Keys |
|----------|------|
| GitHub | `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID` |
| Dokploy env | `JWT_SECRET`, SMTP, `ADMIN_SEED_*`, `CORS_ORIGIN`, `IMAGE_TAG`, `REGISTRY_IMAGE` |

Local `info.md` (Dokploy key / VPS credentials) stays gitignored outside the repo root or ignored.
