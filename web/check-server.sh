#!/bin/bash
LOG=/root/backups/server-check.log
BACKUP_DIR=/root/backups
DATE=$(date +%Y%m%d_%H%M%S)

SCENEFLOW=$(pm2 list 2>/dev/null | grep sceneflow | grep online | wc -l)
DIRECTOR=$(pm2 list 2>/dev/null | grep director-agent | grep online | wc -l)
NGINX=$(systemctl is-active nginx 2>/dev/null)
MEM=$(free -m | awk '/Mem:/{print $3/$2*100}' | cut -d. -f1)
DISK=$(df / | awk '/\/./{print $5}' | tr -d '%')
PORT3003=$(netstat -tlnp 2>/dev/null | grep ":3003" | wc -l)

# 数据库备份新鲜度（2026-09-21 加）：备份脚本每天 03:00 跑，跑挂了以前没人会发现 ——
# /root/backups 里的 sceneflow_*.dump 连着 8 天都是 0 字节，日志却一直写 Backup done。
# 判定：最近一份 dump 必须存在、大于 1MB、且不超过 26 小时（每天跑一次，26 小时留了余量）。
BACKUP_MIN_BYTES=1000000
BACKUP_MAX_AGE_MIN=1560
BACKUP_STATE="missing"
BACKUP_INFO="none"
BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/sceneflow_*.dump 2>/dev/null | head -1)
if [ -n "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(stat -c %s "$BACKUP_FILE" 2>/dev/null || echo 0)
    BACKUP_AGE_MIN=$(( ($(date +%s) - $(stat -c %Y "$BACKUP_FILE" 2>/dev/null || echo 0)) / 60 ))
    BACKUP_STATE="ok"
    if [ "$BACKUP_SIZE" -lt "$BACKUP_MIN_BYTES" ]; then
        BACKUP_STATE="too-small"
    elif [ "$BACKUP_AGE_MIN" -gt "$BACKUP_MAX_AGE_MIN" ]; then
        BACKUP_STATE="stale"
    fi
    BACKUP_INFO="$(basename "$BACKUP_FILE") $((BACKUP_SIZE / 1048576))MB $((BACKUP_AGE_MIN / 60))h ago"
fi

STATUS="OK"
if [ "$SCENEFLOW" -eq 0 ] || [ "$NGINX" != "active" ] || [ "$PORT3003" -eq 0 ] || [ "$BACKUP_STATE" != "ok" ]; then
    STATUS="ALERT"
fi

echo "[$DATE] Mem:${MEM}% Disk:${DISK}% Sceneflow:${SCENEFLOW} Director:${DIRECTOR} Nginx:${NGINX} Port3003:${PORT3003} Backup:${BACKUP_STATE}(${BACKUP_INFO}) Status:$STATUS" >> $LOG

find $LOG -mtime +7 -delete 2>/dev/null
