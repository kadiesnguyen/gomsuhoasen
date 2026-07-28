# Gốm Hoa Sen

Production monorepo: NestJS API, Portal (`/admin/`), Showroom V2 (`/`).

## Deploy (GHCR → Dokploy)

1. Push `main` → GitHub Actions builds `ghcr.io/kadiesnguyen/gomsuhoasen/{api,web}`.
2. Dokploy compose uses [`docker-compose.registry.yml`](./docker-compose.registry.yml) (pull-only).
3. Optional auto-redeploy: repo secrets `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID`.

### Dokploy env (minimum)

| Key | Example |
|-----|---------|
| `REGISTRY_IMAGE` | `ghcr.io/kadiesnguyen/gomsuhoasen` |
| `IMAGE_TAG` | `latest` |
| `JWT_SECRET` | random ≥32 bytes |
| `CORS_ORIGIN` | your public HTTPS origins |
| `ADMIN_SEED_PASSWORD` | only for first seed |
| `WEB_PUBLISH_PORT` | host port (default `8088`) |

Add GHCR registry credentials on the VPS (`read:packages`).

### Local / first seed

```bash
# after stack is up
docker compose -f docker-compose.registry.yml exec api \
  node -e "console.log('api up')"
# seed from a one-off with source + env (see .env.production.example)
```

## Apps

| Path | App |
|------|-----|
| `/` | `apps/showroom_v2` |
| `/admin/` | `apps/portal` |
| `/api/` | `apps/api` |

Node 20 / npm 10. See `.env.production.example`.
