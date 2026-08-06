@echo off
echo === 1) /canvas/ follow redirect chain ===
curl -s -o NUL -w "  /canvas/ final=%%{http_code} redirects=%%{num_redirects}\n" -L --max-time 60 "http://localhost:3100/canvas/"
curl -s -o NUL -w "  /canvas final=%%{http_code} redirects=%%{num_redirects}\n" -L --max-time 60 "http://localhost:3100/canvas"
echo === 2) /canvas/pricing retest ===
curl -s -o NUL -w "  pricing code=%%{http_code} time=%%{time_total}s size=%%{size_download}\n" --max-time 45 "http://localhost:3100/canvas/pricing"
echo === 3) /canvas/canvas unauth headers ===
curl -s -D - -o body_canvas.html --max-time 30 "http://localhost:3100/canvas/canvas" | findstr /i "HTTP/ location"
echo === 4) /canvas/canvas/ with slash ===
curl -s -o NUL -w "  code=%%{http_code} redirect=%%{redirect_url}\n" --max-time 30 "http://localhost:3100/canvas/canvas/"
echo === 5) /canvas/ redirect headers ===
curl -s -D - -o NUL --max-time 30 "http://localhost:3100/canvas/" | findstr /i "HTTP/ location"
