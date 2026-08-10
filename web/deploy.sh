#!/bin/bash
set -e
cd /root/infinite-canvas/web
echo ">>> git pull..."
git pull
echo ">>> npm install..."
npm install --legacy-peer-deps 2>&1 || true
echo ">>> migrate..."
npx prisma migrate deploy 2>&1 || true
echo ">>> build..."
NODE_OPTIONS="--max-old-space-size=1500" npm run build
echo ">>> copy static files..."
rm -rf .next/standalone/.next/static
mkdir -p .next/standalone/.next/static
cp -r .next/static/* .next/standalone/.next/static/
echo ">>> copy public..."
cp -r public .next/standalone/public
echo ">>> copy prisma/pg..."
cp -rf node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -rf node_modules/pg .next/standalone/node_modules/ 2>/dev/null || true
echo ">>> create start.sh..."
cd .next/standalone
cat > start.sh << 'START'
#!/bin/bash
cd /root/infinite-canvas/web/.next/standalone
export $(cat .env | grep -v "^#" | xargs)
exec node server.js
START
chmod +x start.sh
echo ">>> restart PM2..."
PORT=3003 pm2 restart sceneflow --update-env 2>/dev/null || PORT=3003 pm2 start start.sh --name sceneflow
pm2 save
echo "=== DEPLOY DONE ==="
