#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://gomhoasen.vn"
OUTPUT_DIR="${SMOKE_OUTPUT_DIR:-docs/05_OPERATIONS/PRODUCTION_SMOKE}"
TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-10}"
RESOLVE_IP="${SMOKE_RESOLVE_IP:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$OUTPUT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$OUTPUT_DIR/smoke_${STAMP}.md"
PM2_FILE="$OUTPUT_DIR/pm2_${STAMP}.txt"

declare -a URLS=(
  "${BASE_URL}/"
  "${BASE_URL}/gioi-thieu"
  "${BASE_URL}/bo-suu-tap"
  "${BASE_URL}/san-pham"
  "${BASE_URL}/tin-tuc"
  "${BASE_URL}/tin-tuc/trien-lam-di-san-gom-viet"
  "${BASE_URL}/nghe-nhan"
  "${BASE_URL}/nghe-nhan/tran-ngoc-hanh"
  "${BASE_URL}/lien-he"
  "${BASE_URL}/admin/"
  "${BASE_URL}/api/health"
  "${BASE_URL}/api/public/catalog/products"
  "${BASE_URL}/api/artisans"
  "${BASE_URL}/api/site/v2-content"
  "${BASE_URL}/robots.txt"
  "${BASE_URL}/sitemap.xml"
  "${BASE_URL}/version.json"
)

declare -a CURL_RESOLVE_ARGS=()
if [[ -n "$RESOLVE_IP" ]]; then
  base_without_scheme="${BASE_URL#*://}"
  base_hostport="${base_without_scheme%%/*}"
  base_host="${base_hostport%%:*}"
  base_port="${base_hostport##*:}"
  if [[ "$base_port" == "$base_hostport" ]]; then
    case "$BASE_URL" in
      https://*) base_port="443" ;;
      http://*) base_port="80" ;;
      *) base_port="443" ;;
    esac
  fi
  CURL_RESOLVE_ARGS=(--resolve "${base_host}:${base_port}:${RESOLVE_IP}")
fi

check_code() {
  local code="$1"
  local url="$2"
  case "$url" in
    */api/health|*/api/public/catalog/products|*/api/artisans|*/api/site/v2-content|*/version.json)
      [[ "$code" == "200" ]]
      return
      ;;
    *)
      [[ "$code" == "200" || "$code" == "301" || "$code" == "302" ]]
      return
      ;;
  esac
}

{
  echo "# Production Smoke ${STAMP}"
  echo
  echo "- Base URL: ${BASE_URL}"
  echo "- Timeout: ${TIMEOUT_SECONDS}s"
  echo
  echo "| URL | HTTP | Result |"
  echo "|-----|:----:|--------|"
} >"$REPORT_FILE"

FAIL=0
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
for url in "${URLS[@]}"; do
  code="$(curl -s -o "$BODY_FILE" -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "${CURL_RESOLVE_ARGS[@]}" "$url" 2>/dev/null || echo ERR)"
  if check_code "$code" "$url"; then
    result="PASS"
  else
    result="FAIL"
    FAIL=1
  fi
  echo "| ${url} | ${code} | ${result} |" >>"$REPORT_FILE"

  if [[ "$url" == */api/health && "$code" == "200" ]]; then
    if grep -Eq '"success"[[:space:]]*:[[:space:]]*true' "$BODY_FILE" || grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS |" >>"$REPORT_FILE"
    elif grep -Eq "^[[:space:]]*<" "$BODY_FILE"; then
      echo "| ${url} payload | n/a | WARN (non-JSON payload from edge/proxy) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (missing success:true or status:ok) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */api/public/catalog/products && "$code" == "200" ]]; then
    if grep -Eq '"success"[[:space:]]*:[[:space:]]*true' "$BODY_FILE" &&
       grep -Eq '"data"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS (catalog has products) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (catalog is empty or malformed) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */api/artisans && "$code" == "200" ]]; then
    if grep -Eq '"success"[[:space:]]*:[[:space:]]*true' "$BODY_FILE" &&
       grep -Eq '"data"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS (artisan profiles available) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (artisan profiles are empty or malformed) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */api/site/v2-content && "$code" == "200" ]]; then
    if grep -Eq '"brand"[[:space:]]*:[[:space:]]*\{[^}]*"name"[[:space:]]*:[[:space:]]*"[^"]+"' "$BODY_FILE" &&
       grep -Eq '"collections"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"process"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"elements"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"row1"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"categories"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"newsCards"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$BODY_FILE" &&
       grep -Eq '"slug"[[:space:]]*:[[:space:]]*"[^"]+"' "$BODY_FILE" &&
       grep -Eq '"content"[[:space:]]*:[[:space:]]*"[^"]+"' "$BODY_FILE" &&
       grep -Eq '"artisans"[[:space:]]*:[[:space:]]*\{' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS (Showroom V2 content populated) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (Showroom V2 content is empty or incomplete) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */robots.txt && "$code" == "200" ]]; then
    if grep -Eq '^Sitemap:[[:space:]]+https?://.*/sitemap\.xml[[:space:]]*$' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS (sitemap declared) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (sitemap declaration missing) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */sitemap.xml && "$code" == "200" ]]; then
    if grep -Eq '<urlset[^>]*xmlns="http://www\.sitemaps\.org/schemas/sitemap/0\.9"' "$BODY_FILE" &&
       grep -Eq '/tin-tuc/[^<]+' "$BODY_FILE" &&
       grep -Eq '/san-pham/[^<]+' "$BODY_FILE" &&
       grep -Eq '/nghe-nhan/[^<]+' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS (dynamic detail routes available) |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (dynamic detail routes missing) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */version.json && "$code" == "200" ]]; then
    if grep -Eq '"commit"[[:space:]]*:[[:space:]]*"[^"]{7,}"' "$BODY_FILE"; then
      echo "| ${url} payload | n/a | PASS |" >>"$REPORT_FILE"
    else
      echo "| ${url} payload | n/a | FAIL (missing deployment commit) |" >>"$REPORT_FILE"
      FAIL=1
    fi
  fi

  if [[ "$url" == */admin/ && "$code" == "200" ]]; then
    mapfile -t portal_assets < <(
      grep -Eo '(src|href)="[^"]+\.(js|css)"' "$BODY_FILE" |
        sed -E 's/^(src|href)="([^"]+)"$/\2/' |
        sort -u
    )
    if [[ "${#portal_assets[@]}" -eq 0 ]]; then
      echo "| ${url} assets | n/a | FAIL (no JS/CSS assets found) |" >>"$REPORT_FILE"
      FAIL=1
    else
      for asset in "${portal_assets[@]}"; do
        case "$asset" in
          http://*|https://*) asset_url="$asset" ;;
          /*) asset_url="${BASE_URL%/}${asset}" ;;
          *) asset_url="${BASE_URL%/}/admin/${asset#./}" ;;
        esac
        asset_code="$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "${CURL_RESOLVE_ARGS[@]}" "$asset_url" 2>/dev/null || echo ERR)"
        if [[ "$asset_code" == "200" ]]; then
          echo "| ${asset_url} | ${asset_code} | PASS |" >>"$REPORT_FILE"
        else
          echo "| ${asset_url} | ${asset_code} | FAIL (portal asset unavailable) |" >>"$REPORT_FILE"
          FAIL=1
        fi
      done
    fi
  fi
done

if command -v pm2 >/dev/null 2>&1; then
  pm2 status >"$PM2_FILE" || true
  {
    echo
    echo "## PM2"
    echo
    echo '```text'
    cat "$PM2_FILE"
    echo '```'
  } >>"$REPORT_FILE"
else
  echo >>"$REPORT_FILE"
  echo "PM2 not found on host." >>"$REPORT_FILE"
fi

echo "Smoke report: $REPORT_FILE"
if [[ "$FAIL" -ne 0 ]]; then
  echo "Production smoke failed." >&2
  exit 1
fi
echo "Production smoke passed."
