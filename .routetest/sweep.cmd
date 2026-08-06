@echo off
setlocal enabledelayedexpansion
set BASE=http://localhost:3100/canvas
set OUT=%~dp0sweep_result.txt
if exist "%OUT%" del "%OUT%"

call :test "%BASE%/" "GET /canvas (landing)"
call :test "http://localhost:3100/" "GET / (root no-basePath)"
call :test "%BASE%/login" "GET /canvas/login"
call :test "%BASE%/register" "GET /canvas/register"
call :test "%BASE%/pricing" "GET /canvas/pricing"
call :test "%BASE%/agent-lab" "GET /canvas/agent-lab"
call :test "%BASE%/showcase" "GET /canvas/showcase"

for %%R in (admin assets billing canvas cut image prompts video) do (
  call :test "%BASE%/%%R" "GET /canvas/%%R"
)
call :test "%BASE%/canvas/abc123" "GET /canvas/canvas/[id]"

for %%R in (
  "api/auth/session" "api/auth/logout" "api/auth/login"
  "api/billing/plans" "api/prompts"
  "api/sync" "api/user-config" "api/proxy"
  "api/generation/jobs" "api/generation/quota"
  "api/agent-lab/chat" "api/experience-agent"
  "api/admin/overview" "api/admin/users" "api/admin/orders"
  "api/admin/generation-jobs" "api/admin/configs" "api/admin/audit-log"
  "api/billing/orders" "api/billing/subscription" "api/billing/usage/generation"
  "webdav-proxy"
) do (
  call :test "%BASE%/%%~R" "GET /canvas/%%~R"
)

goto :eof

:test
set URL=%1
set LABEL=%2
curl -s -o NUL -w "LABEL=%~2 CODE=%%{http_code} REDIR=%%{redirect_url} SIZE=%%{size_download}\n" --max-time 30 "%URL%" >> "%OUT%"
goto :eof
