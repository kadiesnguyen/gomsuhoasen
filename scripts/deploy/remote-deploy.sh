#!/usr/bin/env bash
# Deploy Gom Hoa Sen Nx apps.
#
# Default CI mode deploys directly on the shell-runner host:
#   DEPLOY_TARGET=local bash scripts/deploy/remote-deploy.sh --skip-build
#
# Manual remote mode remains available for controlled bootstrap/ops:
#   SSH_HOST=160.250.130.89 bash scripts/deploy/remote-deploy.sh --skip-build
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/gomhoasen}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_TARGET="${DEPLOY_TARGET:-${DEPLOY_MODE:-remote}}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-gomhoasen.vn.conf}"
PUPPETEER_SKIP_DOWNLOAD="${PUPPETEER_SKIP_DOWNLOAD:-true}"
export PUPPETEER_SKIP_DOWNLOAD
SKIP_BUILD=0
ROLLBACK=0

REMOTE_USER="${SSH_USER:-root}"
REMOTE_HOST="${SSH_HOST:-160.250.130.89}"
SSH_OPTS="${SSH_OPTS:--o BatchMode=yes -o StrictHostKeyChecking=no}"

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --build-only) BUILD_ONLY=1 ;;
    --rollback) ROLLBACK=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [[ "$DEPLOY_TARGET" != "local" && "$DEPLOY_TARGET" != "remote" ]]; then
  echo "DEPLOY_TARGET must be either 'local' or 'remote'." >&2
  exit 2
fi

log() {
  echo "[$(date +%H:%M:%S)] $*"
}

delete_orphan_showroom_process() {
  local ecosystem_file="$1"
  if grep -q "gomhoasen-showroom" "$ecosystem_file" 2>/dev/null; then
    return
  fi
  pm2 delete gomhoasen-showroom >/dev/null 2>&1 || true
}

ssh_cmd() {
  ssh $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" "$@"
}

require_dist_artifacts() {
  local missing=0
  for path in dist/apps/api dist/apps/portal dist/apps/showroom_v2; do
    if [[ ! -d "$path" ]]; then
      echo "Missing build artifact: $path" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    echo "Build artifacts are required. Re-run without --skip-build or check CI artifacts." >&2
    exit 1
  fi
}

prepare_build_if_needed() {
  cd "$ROOT_DIR"
  if [[ "$SKIP_BUILD" = "1" ]]; then
    log "[1/6] Skip build: using existing dist/ artifacts"
    require_dist_artifacts
    return
  fi

  if [[ "${SKIP_INSTALL:-0}" = "1" ]]; then
    log "[1/6] Skip dependency install: CI workspace is already prepared"
  else
    log "[1/6] Install dependencies"
    npm ci --prefer-offline --no-audit --progress=false
  fi

  log "[2/6] Build apps"
  export VITE_API_URL="${DEPLOY_PUBLIC_API_URL:-/api}"
  export NEXT_PUBLIC_API_URL="${DEPLOY_PUBLIC_API_URL:-/api}"
  npx nx run-many -t build --projects=api,portal,showroom_v2 --skip-nx-cache

  if [[ "${BUILD_ONLY:-0}" = "1" ]]; then
    log "[3/6] Skipping typecheck and tests (--build-only)"
    return
  fi

  log "[3/6] Typecheck + test verification lanes"
  npx nx run-many -t typecheck --projects=api,portal,showroom_v2,iam,catalog,rfq,quote,artisan,file,site,contracts --skip-nx-cache
  npx nx run-many -t test --projects=iam,catalog,rfq,quote,artisan,file,site --skip-nx-cache
}

write_version_file() {
  local version_payload
  version_payload="$(cat <<JSON
{
  "version": "${CI_PIPELINE_IID:-local}-${CI_COMMIT_SHORT_SHA:-manual}",
  "branch": "${CI_COMMIT_BRANCH:-$(git branch --show-current 2>/dev/null || echo unknown)}",
  "commit": "${CI_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
)"
  printf '%s\n' "$version_payload" > "version.json"
  printf '%s\n' "$version_payload" > "dist/apps/showroom_v2/version.json"
}

create_release_archive() {
  local archive_name="$1"

  log "[4/6] Creating release archive"
  write_version_file
  COPYFILE_DISABLE=1 LC_ALL=C tar --format ustar -czf "$archive_name" \
    dist/ \
    package.json package-lock.json \
    scripts/deploy/ecosystem.config.cjs \
    scripts/deploy/production-smoke.sh \
    scripts/deploy/reset-admin-password.mjs \
    nginx/ \
    version.json
  rm -f version.json
}

ensure_local_shared_env() {
  mkdir -p "$DEPLOY_DIR/shared"
  if [[ -s "$DEPLOY_DIR/shared/.env" ]]; then
    return
  fi

  if [[ -s "$ROOT_DIR/.env.production" ]]; then
    log "Bootstrapping $DEPLOY_DIR/shared/.env from .env.production"
    install -m 0600 "$ROOT_DIR/.env.production" "$DEPLOY_DIR/shared/.env"
    return
  fi

  echo "$DEPLOY_DIR/shared/.env is required for production deploy." >&2
  echo "Create it with MONGODB_URI, JWT_SECRET, NEXT_PUBLIC_API_URL, VITE_API_URL, and CORS_ORIGIN." >&2
  exit 1
}

install_release_local() {
  local release_name="$1"
  local archive_name="$2"
  local release_dir="$DEPLOY_DIR/releases/$release_name"

  log "[5/6] Installing release locally on this server"
  mkdir -p "$DEPLOY_DIR/releases" "$DEPLOY_DIR/uploads" "$DEPLOY_DIR/backups" "$DEPLOY_DIR/shared"
  ensure_local_shared_env
  mkdir -p "$release_dir"
  tar -xzf "$archive_name" -C "$release_dir"
  rm -f "$archive_name"

  ln -sfn "$DEPLOY_DIR/shared/.env" "$release_dir/.env"

  log "Installing production runtime dependencies"
  cd "$release_dir"
  npm ci --omit=dev --prefer-offline --no-audit --progress=false

  local previous_current
  previous_current="$(readlink -f "$DEPLOY_DIR/current" 2>/dev/null || true)"
  ln -sfn "$release_dir" "$DEPLOY_DIR/current"

  log "[6/6] Restarting PM2 and reloading NGINX"
  if ! pm2 startOrReload "$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs" --update-env --env production; then
    if [[ -n "$previous_current" ]]; then
      ln -sfn "$previous_current" "$DEPLOY_DIR/current"
    fi
    echo "PM2 restart failed; restored previous current symlink." >&2
    exit 1
  fi
  delete_orphan_showroom_process "$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs"

  local nginx_backup="$DEPLOY_DIR/backups/${NGINX_SITE_NAME}.${release_name}.bak"
  if [[ -f "/etc/nginx/sites-available/$NGINX_SITE_NAME" ]]; then
    cp "/etc/nginx/sites-available/$NGINX_SITE_NAME" "$nginx_backup"
  fi
  install -m 0644 "$release_dir/nginx/gomhoasen.conf" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
  ln -sfn "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"
  if ! nginx -t; then
    if [[ -s "$nginx_backup" ]]; then
      install -m 0644 "$nginx_backup" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
    fi
    if [[ -n "$previous_current" ]]; then
      ln -sfn "$previous_current" "$DEPLOY_DIR/current"
      pm2 startOrReload "$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs" --update-env --env production || true
    fi
    echo "NGINX config test failed; restored previous nginx config and current symlink." >&2
    exit 1
  fi
  systemctl reload nginx

  sleep "${DEPLOY_SMOKE_WARMUP_SECONDS:-8}"
  SMOKE_OUTPUT_DIR="$DEPLOY_DIR/backups/smoke" \
  SMOKE_RESOLVE_IP="127.0.0.1" \
    bash "$DEPLOY_DIR/current/scripts/deploy/production-smoke.sh" --base-url "https://gomhoasen.vn" --timeout "${SMOKE_TIMEOUT_SECONDS:-15}"

  cd "$DEPLOY_DIR/releases"
  ls -dt */ | tail -n +"$((KEEP_RELEASES + 1))" | xargs rm -rf -- 2>/dev/null || true

  log "Deploy complete: $release_dir"
}

install_release_remote() {
  local release_name="$1"
  local archive_name="$2"
  local env_tmp="/tmp/gomhoasen-env-$release_name"

  log "[5/6] Transferring release to $REMOTE_USER@$REMOTE_HOST"
  ssh_cmd "mkdir -p '$DEPLOY_DIR/releases' '$DEPLOY_DIR/uploads' '$DEPLOY_DIR/backups' '$DEPLOY_DIR/shared'"
  rsync -az -e "ssh $SSH_OPTS" "$archive_name" "$REMOTE_USER@$REMOTE_HOST:/tmp/$archive_name"

  if [[ -s "$ROOT_DIR/.env.production" ]]; then
    rsync -az -e "ssh $SSH_OPTS" "$ROOT_DIR/.env.production" "$REMOTE_USER@$REMOTE_HOST:$env_tmp"
  fi
  rm -f "$archive_name"

  log "[6/6] Installing release and restarting services remotely"
  ssh_cmd "
    set -euo pipefail
    RELEASE_DIR='$DEPLOY_DIR/releases/$release_name'
    mkdir -p \"\$RELEASE_DIR\" '$DEPLOY_DIR/backups' '$DEPLOY_DIR/shared'

    if [ ! -s '$DEPLOY_DIR/shared/.env' ]; then
      if [ -s '$env_tmp' ]; then
        install -m 0600 '$env_tmp' '$DEPLOY_DIR/shared/.env'
      else
        echo '$DEPLOY_DIR/shared/.env is required for production deploy.' >&2
        exit 1
      fi
    fi
    rm -f '$env_tmp'

    tar -xzf '/tmp/$archive_name' -C \"\$RELEASE_DIR\"
    rm -f '/tmp/$archive_name'
    ln -sfn '$DEPLOY_DIR/shared/.env' \"\$RELEASE_DIR/.env\"

    cd \"\$RELEASE_DIR\"
    npm ci --omit=dev --prefer-offline --no-audit --progress=false
    previous_current=\$(readlink -f '$DEPLOY_DIR/current' 2>/dev/null || true)
    ln -sfn \"\$RELEASE_DIR\" '$DEPLOY_DIR/current'

    if ! pm2 startOrReload '$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs' --update-env --env production; then
      if [ -n \"\$previous_current\" ]; then
        ln -sfn \"\$previous_current\" '$DEPLOY_DIR/current'
      fi
      echo 'PM2 restart failed; restored previous current symlink.' >&2
      exit 1
    fi
    if ! grep -q 'gomhoasen-showroom' '$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs' 2>/dev/null; then
      pm2 delete gomhoasen-showroom >/dev/null 2>&1 || true
    fi

    nginx_backup='$DEPLOY_DIR/backups/$NGINX_SITE_NAME.$release_name.bak'
    if [ -f '/etc/nginx/sites-available/$NGINX_SITE_NAME' ]; then
      cp '/etc/nginx/sites-available/$NGINX_SITE_NAME' \"\$nginx_backup\"
    fi
    install -m 0644 \"\$RELEASE_DIR/nginx/gomhoasen.conf\" '/etc/nginx/sites-available/$NGINX_SITE_NAME'
    ln -sfn '/etc/nginx/sites-available/$NGINX_SITE_NAME' '/etc/nginx/sites-enabled/$NGINX_SITE_NAME'
    if ! nginx -t; then
      if [ -s \"\$nginx_backup\" ]; then
        install -m 0644 \"\$nginx_backup\" '/etc/nginx/sites-available/$NGINX_SITE_NAME'
      fi
      if [ -n \"\$previous_current\" ]; then
        ln -sfn \"\$previous_current\" '$DEPLOY_DIR/current'
        pm2 startOrReload '$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs' --update-env --env production || true
      fi
      echo 'NGINX config test failed; restored previous nginx config and current symlink.' >&2
      exit 1
    fi
    systemctl reload nginx

    sleep \"\${DEPLOY_SMOKE_WARMUP_SECONDS:-8}\"
    SMOKE_OUTPUT_DIR='$DEPLOY_DIR/backups/smoke' \
    SMOKE_RESOLVE_IP='127.0.0.1' \
      bash '$DEPLOY_DIR/current/scripts/deploy/production-smoke.sh' --base-url 'https://gomhoasen.vn' --timeout \"\${SMOKE_TIMEOUT_SECONDS:-15}\"

    cd '$DEPLOY_DIR/releases'
    ls -dt */ | tail -n +'$((KEEP_RELEASES + 1))' | xargs rm -rf -- 2>/dev/null || true
    echo 'Deploy complete:' \"\$RELEASE_DIR\"
  "
}

rollback_local() {
  if [[ ! -d "$DEPLOY_DIR/releases" ]]; then
    echo "No release directory found at $DEPLOY_DIR/releases." >&2
    exit 1
  fi
  cd "$DEPLOY_DIR/releases"
  local previous
  previous="$(ls -dt */ 2>/dev/null | sed -n '2p' | tr -d '/')"
  if [[ -z "$previous" ]]; then
    echo "No previous release found." >&2
    exit 1
  fi
  ln -sfn "$DEPLOY_DIR/releases/$previous" "$DEPLOY_DIR/current"
  pm2 startOrReload "$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs" --update-env --env production
  nginx -t
  systemctl reload nginx
  log "Rolled back to $previous"
}

rollback_remote() {
  ssh_cmd "
    set -euo pipefail
    cd '$DEPLOY_DIR/releases'
    previous=\$(ls -dt */ 2>/dev/null | sed -n '2p' | tr -d '/')
    if [ -z \"\$previous\" ]; then
      echo 'No previous release found.' >&2
      exit 1
    fi
    ln -sfn '$DEPLOY_DIR/releases/'\"\$previous\" '$DEPLOY_DIR/current'
    pm2 startOrReload '$DEPLOY_DIR/current/scripts/deploy/ecosystem.config.cjs' --update-env --env production
    nginx -t
    systemctl reload nginx
    echo 'Rolled back to' \"\$previous\"
  "
}

if [[ "$ROLLBACK" = "1" ]]; then
  if [[ "$DEPLOY_TARGET" = "local" ]]; then
    rollback_local
  else
    rollback_remote
  fi
  exit 0
fi

cd "$ROOT_DIR"
prepare_build_if_needed

RELEASE_NAME="$(date +%Y%m%d_%H%M%S)_${CI_PIPELINE_IID:-local}"
ARCHIVE_NAME="release-$RELEASE_NAME.tar.gz"
create_release_archive "$ARCHIVE_NAME"

if [[ "$DEPLOY_TARGET" = "local" ]]; then
  install_release_local "$RELEASE_NAME" "$ARCHIVE_NAME"
else
  install_release_remote "$RELEASE_NAME" "$ARCHIVE_NAME"
fi
