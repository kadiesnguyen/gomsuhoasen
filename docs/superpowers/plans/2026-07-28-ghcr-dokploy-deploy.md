# GHCR Dokploy Deploy Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship deployable git repo with Docker/GHCR/Dokploy for Gốm Hoa Sen.

**Architecture:** Multi-stage Dockerfiles for api + web; `docker-compose.registry.yml` pull-only; Actions workflow mirrors crm-vbp.

**Tech Stack:** Node 20, Nx, NestJS, Vite, NGINX, MongoDB 7, GHCR, Dokploy.

## Global Constraints

- Node `>=20 <21`; no secrets in git
- Repo root = former `source/` tree
- Images: `ghcr.io/kadiesnguyen/gomsuhoasen/{api,web}`
- Mongo must expose replica set `rs0`

---

### Task 1: Ignore + Docker ignore

- [ ] Add `.gitignore`, `.dockerignore`

### Task 2: Docker runtime

- [ ] `Dockerfile.api`, `Dockerfile.web`, `docker/nginx.conf`
- [ ] `docker-compose.registry.yml`, `.env.production.example` Docker notes

### Task 3: CI

- [ ] `.github/workflows/docker-ghcr.yml` (build api+web, deploy Dokploy)

### Task 4: Git + push

- [ ] Init git in source root, commit necessary files, push `main` to `kadiesnguyen/gomsuhoasen`
- [ ] Set GitHub secrets (no COMPOSE_ID until Dokploy project exists)
