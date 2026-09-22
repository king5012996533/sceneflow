#!/bin/bash
# 生成链路「快兜底」：poll（Replicate 回源取件）与 resend（死在半路的调用补发）各跑一次。
#
# 2026-09-21 起从「每分钟一次」压到「每 15 秒一次」（crontab 里 4 条带 sleep 偏移的条目）。
# 原因：这两条决定「上游已经出结果」到「我们结账」之间的空窗，原来最坏 60 秒 —— 用户在画布上
# 就是多盯一分钟进度条。两个接口各自有进程内互斥与节流（poll 按每任务 nextPollAt、
# resend 只补发投出去 2 分钟以上的信封），所以跑密一点只是发现得更快，不会重复调用上游。
#
# 这份是线上脚本的副本（线上路径 /root/generation-tick.sh）：deploy.sh 不会安装它，
# 改动后要手工同步到服务器，别只改这里。
STAMP=$(date '+%F %T')
SECRET=$(grep -h '^GENERATION_WORKER_SECRET=' /root/infinite-canvas/web/.env | cut -d= -f2-)
[ -z "$SECRET" ] && exit 1
echo "$STAMP poll $(curl -s -m 30 -X POST -H "x-generation-worker-secret: $SECRET" http://127.0.0.1:3003/canvas/api/internal/generation/poll)" >> /var/log/generation-poll.log
echo "$STAMP resend $(curl -s -m 30 -X POST -H "x-generation-worker-secret: $SECRET" http://127.0.0.1:3003/canvas/api/internal/generation/resend)" >> /var/log/generation-resend.log
