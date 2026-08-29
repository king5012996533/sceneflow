#!/bin/bash
# 2G 内存服务器务必先加 swap，否则构建可能被 OOM killer 杀掉：
#   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
#   echo '/swapfile none swap sw 0 0' >> /etc/fstab
set -e
cd /root/infinite-canvas/web
echo ">>> git pull..."
git pull
echo ">>> npm install..."
npm install --legacy-peer-deps 2>&1 || true
echo ">>> migrate..."
npx prisma migrate deploy 2>&1 || true
echo ">>> build..."
SKIP_BUILD_TYPECHECK=1 NODE_OPTIONS="--max-old-space-size=1024" npm run build || {
    echo ">>> Turbopack 构建失败，回退 webpack 构建（单进程省内存配置）..."
    SKIP_BUILD_TYPECHECK=1 NODE_OPTIONS="--max-old-space-size=1024" npm run build:webpack
}
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
export NODE_OPTIONS="--max-old-space-size=768"
exec node server.js
START
chmod +x start.sh
echo ">>> restart PM2..."
PORT=3003 pm2 restart sceneflow --update-env --max-memory-restart 1200M 2>/dev/null || PORT=3003 pm2 start start.sh --name sceneflow --max-memory-restart 1200M
pm2 save
echo "=== DEPLOY DONE ==="
