@echo off
cd /d C:\Users\Administrator\AppData\Local\hermes\infinite-canvas\web
C:\Users\Administrator\.cherrystudio\bin\bun.exe x prisma generate
C:\Users\Administrator\.cherrystudio\bin\bun.exe x prisma db push
echo DONE
