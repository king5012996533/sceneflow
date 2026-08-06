#!/bin/bash
LOG=/root/backups/server-check.log
DATE=$(date +%Y%m%d_%H%M%S)

SCENEFLOW=$(pm2 list 2>/dev/null | grep sceneflow | grep online | wc -l)
DIRECTOR=$(pm2 list 2>/dev/null | grep director-agent | grep online | wc -l)
NGINX=$(systemctl is-active nginx 2>/dev/null)
MEM=$(free -m | awk '/Mem:/{print $3/$2*100}' | cut -d. -f1)
DISK=$(df / | awk '/\/./{print $5}' | tr -d '%')
PORT3003=$(netstat -tlnp 2>/dev/null | grep ":3003" | wc -l)

STATUS="OK"
if [ "$SCENEFLOW" -eq 0 ] || [ "$NGINX" != "active" ] || [ "$PORT3003" -eq 0 ]; then
    STATUS="ALERT"
fi

echo "[$DATE] Mem:${MEM}% Disk:${DISK}% Sceneflow:${SCENEFLOW} Director:${DIRECTOR} Nginx:${NGINX} Port3003:${PORT3003} Status:$STATUS" >> $LOG

find $LOG -mtime +7 -delete 2>/dev/null
