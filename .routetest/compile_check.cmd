@echo off
curl -s -o NUL -w "image=%%{http_code} t=%%{time_total}s\n" -H "Cookie: ic_token=xxxxxxxxxxxxxxxxxxxxxx" --max-time 120 http://localhost:3100/canvas/image
curl -s -o NUL -w "video=%%{http_code} t=%%{time_total}s\n" -H "Cookie: ic_token=xxxxxxxxxxxxxxxxxxxxxx" --max-time 120 http://localhost:3100/canvas/video
curl -s -o NUL -w "admin=%%{http_code} t=%%{time_total}s\n" -H "Cookie: ic_token=xxxxxxxxxxxxxxxxxxxxxx" --max-time 120 http://localhost:3100/canvas/admin
