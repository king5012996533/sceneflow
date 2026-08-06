#!/bin/bash
BASE="http://localhost:3000/canvas"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
WORK="$(cd "$(dirname "$0")" && pwd)"

test_url() {
    local url="$1"
    local label="$2"
    local res=$(curl -s -o "$WORK/body.html" -w "%{http_code}|%{redirect_url}" -A "$UA" --max-time 20 "$url" 2>/dev/null)
    local code="${res%%|*}"
    local redir="${res#*|}"
    local size=$(wc -c < "$WORK/body.html" 2>/dev/null || echo 0)
    printf "%-45s [%s] size=%-7s redirect=%s\n" "$label" "$code" "$size" "$redir"
}

echo "=== 公开页面路由 ==="
test_url "$BASE/" "GET /canvas (landing)"
test_url "/" "GET / (root, 无 basePath)"
test_url "$BASE/login" "GET /canvas/login"
test_url "$BASE/register" "GET /canvas/register"
test_url "$BASE/pricing" "GET /canvas/pricing"
test_url "$BASE/agent-lab" "GET /canvas/agent-lab"
test_url "$BASE/showcase" "GET /canvas/showcase"

echo ""
echo "=== 需登录页面路由（应重定向到登录） ==="
for r in admin assets billing canvas cut image prompts video; do
    test_url "$BASE/$r" "GET /canvas/$r"
done
test_url "$BASE/canvas/abc123" "GET /canvas/canvas/[id]"

echo ""
echo "=== 未登录 API 路由（应返回 401 JSON） ==="
for r in \
  "api/auth/session" "api/auth/logout" "api/auth/login" \
  "api/billing/plans" "api/prompts" \
  "api/sync" "api/user-config" "api/proxy" \
  "api/generation/jobs" "api/generation/quota" \
  "api/agent-lab/chat" "api/experience-agent" \
  "api/admin/overview" "api/admin/users" "api/admin/orders" \
  "api/admin/generation-jobs" "api/admin/configs" "api/admin/audit-log" \
  "api/billing/orders" "api/billing/subscription" "api/billing/usage/generation" \
  "webdav-proxy" ; do
    test_url "$BASE/$r" "GET /canvas/$r"
done
