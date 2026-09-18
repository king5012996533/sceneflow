# 生成链路可靠性改造 · 三阶段计划（2026-09-18 起）

> **这份文档只服务于这次改造，三个阶段全部完成并验证后删掉它。**
> 每完成一项就把勾打上、补一行「进度日志」，这样任务被中途打断也能接着做。
> 状态：🟡 进行中（阶段 0 / 1 / 2）

## 0. 状态总览

| 阶段 | 内容                                                      | 状态              | 完成时间   |
| ---- | --------------------------------------------------------- | ----------------- | ---------- |
| 0    | 止血 + 账对得上（取消不扔图、丢弃即日志、对账字段与日报） | ✅ 完成并真机验证 | 2026-09-18 |
| 1    | 请求信封存服务端 + 补发 worker（进程死掉也能补回成品）    | ⬜ 未开始         |            |
| 2    | 生成整段搬到服务端（根治：连接断不断都不影响成品归属）    | ⬜ 未开始         |            |

> 阶段 0 的两处偏离（记录在此，免得以后翻代码时困惑）：
>
> 1. 没有新增 Prisma 字段。`artifactKept` 由 `resultData.items` 里的归档键推导，「保不住/丢弃」用现有的 `externalStatus='dropped'` 打标记，「服务端找回」用 `externalStatus='recovered'` —— 都不需要迁移，线上零风险。
> 2. `upstreamOutcome`（上游到底 ok/error/timeout）留到阶段 1 再落：那时调用由服务端发起，能原子地写清楚；现在写只能靠猜。

---

## 1. 背景与诊断（结论先给死）

**这是我们的问题，不是上游的问题，因此不换上游。**

证据：

- 上游出图稳定，我们侧统计成功任务耗时中位 **76 秒**、p90 191 秒、p99 418 秒（和对方说的「多数 50 秒内」同一量级）。
- 7 天图片/视频失败归因（共 170 条）：上游自身毛病 61（36%，其中最大一块是渠道预扣额度记账失败 49 条，集中在 9/16–9/17）；**上游报错但根因在我们 37（22%）**；上游策略拒绝 8（5%）；**我们这侧 51（30%）**；其他 13（8%）。
- 7 天 389 条「成功」任务里，**只有 20 条在服务器上留下了成品**（约 95% 的产出当时没留住）—— 图是我们自己丢的。
- 真机探针（2026-09-18 15:02）：任务 `cmu737cf1000vvrtiunjubfv1` 起 1.5 秒后被 PATCH cancelled → 服务端当场退款；上游那次调用随后正常返回 **200 + 完整 PNG（b64_json）**，而该任务 `已归档 0 条`、`resultData 空`、日志**一个字都没有**。用户点一次「停止生成」= 上游照画照计费、我们退款并把图扔掉。

**「时间差」的真相**：上游结果先到**我们的服务器**，再由服务器转给浏览器。浏览器等的不是上游，是我们转给它的那个响应；那条连接一停，它就只能转圈或报失败，而上游早就画完了。所以修法不是调时间差，而是**把成品的目的地从浏览器改成服务器**。

### 目标架构

```
现在：浏览器 ──长连接等 1–8 分钟──> 我们 ──> 上游     ← 连接一断，成品没有归宿
改成：浏览器 ──提交(0.1 秒)──> 我们 ──> 队列 ──> 上游 ──> 归档落盘
      浏览器 ──轮询/看进度──> 我们 ──> 成功就直接读已落盘的成品
```

### 绝不能破的不变量

1. **上游产出的成品永不被销毁**：任何分支只要报文里有成品，就必须归档（先保图，再谈钱）。
2. **不重复向用户收费**：已经退款的（取消/故障）不再收；未退款的成功任务照收。
3. **任何「有成品但没保留」的分支必须打日志**（现在完全静默，这是这次问题藏了几天没被发现的原因）。
4. 用户主动取消 ≠ 上游停止：同步通道没有取消接口，计费由上游决定。

---

## 2. 阶段 0：止血 + 让账对得上（30–60 分钟，低风险）

### 2.1 任务清单

- [x] **A. 取消不再扔图**
  - 纯逻辑：`web/src/lib/generation/generation-recovery.ts` 新增 `decideRescueAction`（claim / keep-artifact / skip）、`isCanceledArtifactKeepable`、`CANCELED_ARTIFACT_WINDOW_MS = 30 分钟`。
  - 服务端：`generation-rescue.server.ts` 按决策执行；「保图」分支不改状态、不再收费，只归档 + 标 `externalStatus='recovered'`；`generation-result.server.ts` 允许把成品挂到 `cancelled` 任务上。
  - 界面：`web/src/app/(user)/records/page.tsx` —— 手上有成品但状态不是成功的记录，不再挂红字，改为「上游其实已经画完，图已为你保留，本次未扣费。」
- [x] **B. 丢弃即日志**：`salvageGenerationArtifacts` 的「保不住」分支现在 `console.warn` 一行，并在任务上打 `externalStatus='dropped'`。
- [x] **C. 对账口径**：见上方「阶段 0 的两处偏离」——用现有字段表达，不迁移。
- [x] **D. 对账日报**：纯逻辑 `generation-report.ts` + `generation-report.server.ts` + 内部接口 `POST /api/internal/generation/daily-report`（worker 密钥）→ 落盘 `~/.sceneflow/reports/generation-daily-<日期>.md`、打 PM2 日志、尽力发邮件给管理员。单测 `npm run test:report`（8 条）。crontab 每天 09:00 调用。

### 2.2 验收（必须真机验证，不许只看代码）

- [x] 单测与门禁：`tsc` / `guard` / `test:recovery`（24 条，含「1.5 秒取消、200 秒后上游送图」的复现用例）/ `test:report`（8 条）/ `test:artifact` / `test:inflight` / `test:sweep` 全绿，`build:webpack` 通过。
- [x] 真机复验「取消不扔图」（2026-09-18 23:20）：探针任务 `cmu73upmn0001jvtingafi6qv`，起任务 1.5 秒后 PATCH cancelled（服务端当场退款）→ 上游约 3 分钟后才把图送回，**探针脚本自己都在 200 秒时放弃了** → 结果：任务保持 `cancelled` + `quotaRefunded=true`（没向用户收费）、`externalStatus=recovered`、`resultData.items[0].archiveKey=cmu73upmn0001jvtingafi6qv/0`（1726439 字节），归档目录里文件在；PM2 日志两行：「已被用户取消，上游仍产出 1 份成品：保图不保账，归档留存（本次不向用户收费）」「归档完成 1/1（已取消，图保留）」。**这一条同时证明了「客户端放弃 ≠ 成品丢失」**。
- [x] 真机复验记录页显示（2026-09-18 23:2x）：桌面 1440×1200 与手机 390×844 两种视口，用探针账号登录 `/records` → 那条 cancelled 记录显示成品图（`GET /api/generation/jobs/<id>/media/0` 返回 200）、显示「上游其实已经画完，图已为你保留，本次未扣费。」、下载入口在、横向溢出 0px；同一页面上「确实什么都没产出」的失败记录仍照旧挂红字（该账号另有 3 条 `failed` 且无成品，属预期）。
- [x] 日报真机跑一次（2026-09-18 23:23）：`POST /api/internal/generation/daily-report {hours:72}` → 200，落盘 `~/.sceneflow/reports/generation-daily-2026-09-18.md`，PM2 日志 `[generation-report] …上游出图 21 次（未收费 3）｜上游失败退款 137｜丢图 0｜…｜邮件 1（15012996533@163.com）`。四本账用**另一套 SQL**（`interval '72 hours'` + `e->>'archiveKey' <> ''`，与实现里的参数化查询写法不同）独立重算，逐项吻合：总 462 / 成功 321 / 失败 137 / 取消 4｜出图已收费 18｜出图未收费 3（1 条取消保图 + 2 条我们故障补认领）｜失败已退款 137｜有成品却没留下 0；抽 8 条明细逐条看过，分类无误。
- 附带结论（归档覆盖率按北京时间逐小时）：09-18 20:00 那小时起 5→7→6 条成功任务全部带归档；21:00 之后 **13/13 = 100%**。09-16（62）、09-17（150）两天成功任务 0 条本地归档，是修复前的存量，不是新问题。
- [x] 截图视觉复核（视觉模型，桌面 + 手机两张）：确认那张「已取消 + 有成品 + 本次未扣费」的卡片渲染正常 —— 无错位、无文字溢出、无破图、无按钮遮挡、手机端无横向溢出。

> 已知无害的小瑕疵（记着，暂不改）：取消保图的记录上会同时挂「已取消」和「服务端找回」两个标记。两个都不算错（图确实是服务端保住的），但语义上可以再收一收，等阶段 2 统一处理展示层时一起看。

---

## 3. 阶段 0 附带：对账口径（固定四行）

| 口径              | 含义                                                 | 目标                   |
| ----------------- | ---------------------------------------------------- | ---------------------- |
| 上游 ok · 已收费  | 正常                                                 | 绝大多数               |
| 上游 ok · 已退款  | 用户取消，或我们的故障（**就是「对不上」的那部分**） | 只应剩「用户主动取消」 |
| 上游失败 · 已退款 | 正常                                                 | —                      |
| 上游 ok · 未留图  | 黑洞残留                                             | **0**                  |

---

## 4. 阶段 1：请求信封存服务端 + 补发 worker（1–2 天，性价比最高）

**要解决的问题**：「我们自己的上游调用中途死掉」（部署重启 PM2、900 秒应用超时、连接被重置）→ 同步通道没有任务号 → 成品现在取不回来。

### 4.1 任务清单

- [ ] **A. 落信封**：让代理路由在**发请求之前**把完整信封写进任务记录（`url / method / headers / body`；form-data 路由的素材二进制单独落盘保存，限制大小）。
  - 位置：`web/src/app/api/proxy/route.ts`、`web/src/app/api/proxy/form-data/route.ts`
  - 好处：**前端不用改** —— 路由本来就手握这套信封。
- [ ] **B. 补发 worker**：独立 PM2 进程（参照 `director-agent` 那样单独起，**不要挂在 web 进程里**，这样部署重启 web 不会掐断它）。
  - 领取条件：`running` + **确认无任何在飞调用**（`upstream-inflight` 登记簿为空）+ 已超过 N 秒（建议 120 秒）+ 没有成品。
  - 预算：每单最多补发 **1 次**（可配置），补发前后都打日志。
- [ ] **C. 结账归属**：补发成功 → 照常归档、任务成功、照常收费；补发失败 → 照旧失败退款。

### 4.2 风险控制

- 补发可能对同一张图向上游付两次钱：用「确认无在飞调用 + 时间阈值 + 每单 1 次」三重约束兜住；宁可多付一次，也不接受「付一次、图上谁都没有」。
- 验证：真机制造进程被杀（`pm2 restart sceneflow` 落在生成中途），断言成品最终仍被归档且任务成功。

---

## 5. 阶段 2：生成整段搬到服务端（根治，2–3 天，建议本周排期）

- [ ] **A. 前端**：提交（参数 + 参考素材**先上传到我们的存储**）→ 立刻拿任务号 → 轮询/看进度 → 成功后直接取归档成品（媒体路由已有）。
- [ ] **B. 服务端 worker**：独立 PM2 进程领任务 → 调上游（信封已在服务端）→ 提取成品 → 归档 → 结账（真成功才收费、真失败才退款）→ 写状态。
- [ ] **C. 取消语义**：worker 收到取消标记即停止等待；已产出/仍在产出的图照常归档（不扔），额度按取消退。
- [ ] **D. 兼容与回滚开关**：保留旧链路（代理直连）作为回退开关，灰度切换。

**做完这一阶段的收益**：连接断不断、页面关不关都不影响成品归属；「上游出结果了前端还在转圈」消失（上游一返回，几百毫秒内任务即成功，前端下一轮轮询立刻出图）；阶段 1 的补发需求也自然消解。

---

## 6. 渠道策略（不换上游，但要装保险）

- **自动化阈值**（先定规矩，免得以后拍脑袋）：
  - 连续 3 天成功率 < 95% 或平均耗时 > 3 分钟 → 该渠道自动降权；
  - 连续 7 天成功率 < 90% → 下线换人。
- **慢任务优先走任务制渠道**：4K、视频这类要等几分钟的交给有任务号的渠道（apimart 等，我们已有「补取件」）；ggwk1 这条同步通道留给 50 秒级的常规出图。
- **拿账单找上游确认**：那 49 条「chat pre-consumed quota failed, user quota: ＄0.001320, need…」（9/16–9/17 集中）是他们的记账 bug，还是我们在这个网关分组的余额/账务问题 —— 按他们的规则这类请求可能照样计费，属于「上游扣了、我们不知道」。

---

## 7. 执行环境速查（省得每次重查）

- 仓库：`C:\Users\Administrator\AppData\Local\hermes\infinite-canvas`（WSL `/mnt/c/Users/Administrator/AppData/Local/hermes/infinite-canvas`），web 在 `web/`。
- 生产：`root@8.163.71.55`，仓库 `/root/infinite-canvas`，PM2 应用 `sceneflow`（3003，cwd `.next/standalone`），站点 `https://xingtudesign.com`。
- 门禁（在 `web/` 下，用 `cmd.exe /c "cd /d ... && ..."` 跑）：
  `npx tsc --noEmit && npm run guard && npm run test:recovery && npm run test:inflight && npm run test:artifact && npm run test:sweep && npm run build:webpack`
- 提交推送：中文提交信息走 UTF-8 文件 + `git commit -F`，推送 `cmd.exe /c "cd /d C:\Users\Administrator\AppData\Local\hermes\infinite-canvas && git push origin main"`。注意 `git add -A` 会带上临时信息文件，提交后要 `git show --stat` 核对。
- 部署：`cmd.exe /c "C:\Users\Administrator\deploy_tmp.bat"`（**有在飞生成时先别部署**）。
- VPS 执行脚本的方式：本地写 `.sh` → `cmd.exe /c "ssh -o BatchMode=yes root@8.163.71.55 bash -s < C:\Users\Administrator\q_x.sh"`；WSL 里没有 `unix2dos`（不必转行尾）。SQL 里的引号容易在传输中被吃掉，**稳妥做法是把 SQL 或 node 脚本 base64 后写入远端再执行**（`echo '<b64>' | base64 -d > /tmp/x.sql`）。
- 库连接：`cd /root/infinite-canvas/web && DB=$(grep -m1 '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | tr -d '\r'); psql "$DB" ... < /dev/null`（camelCase 列名要加双引号；`resultData->'items'` 里看归档用 `e ? 'archiveKey'`）。
- 浏览器复验（CDP，Windows 已跑着 headless Chrome，端口 9222）：`studio_deferred.cjs`（请求阶段断连）、`studio_broken.cjs`（响应阶段断连）、`records_error_check.cjs`（记录页）、`mobile_records.cjs`；配套 `run_*.bat`。日志写文件再读，别在启动命令里 `| tail`。
- 关键文件：
  - `web/src/lib/generation/{generation-rescue.server.ts,generation-result.server.ts,generation-recovery.ts,generation-guard.ts,generation-jobs.server.ts,upstream-inflight.ts}`
  - `web/src/app/api/proxy/{route.ts,form-data/route.ts}`、`web/src/app/(user)/records/page.tsx`
  - 归档目录：`~/.sceneflow/generation-media/<jobId>/<index>`（保留 2 天）

---

## 8. 进度日志

- 2026-09-18 已上线（本轮前置修复，8 个提交）：上游产出即抢救、成品回传浏览器、客户端放弃≠上游没产出、断网不许断言失败、恢复流程不被调用方 signal 掐死、记录页只在不成功的任务上展示原因、补认领、网络层失败时「已失败」不算结论。线上成效：13:00 之后 12 条成功任务 **全部归档**（此前 06–11 点 60 条成功里 0 条归档）。
- 2026-09-18 15:02 真机探针确认取消口子（见 §1），本文档由此建立。
- 2026-09-18 23:20—23:30 **阶段 0 验收全部通过**（取消不扔图 / 记录页双视口 / 日报对账），代码 `8ff9ee6` 已在线上跑。下一步进阶段 1：请求信封存服务端 + 补发 worker。阶段 1 的代码改动前，先想清楚「怎么确认没有在飞的调用」——现有 `upstream-inflight` 登记簿是进程内的，补发 worker 是独立进程，看不见它，这一条得先解决（可能要落库或落到共享文件）。
