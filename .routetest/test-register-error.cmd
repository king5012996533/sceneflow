@echo off
curl.exe -sS -i --max-time 45 -X POST http://localhost:3100/canvas/api/auth/send-code -H "Content-Type: application/json" --data-raw "{\"target\":\"sceneflow-test-20260804185843@example.com\",\"method\":\"email\"}"
