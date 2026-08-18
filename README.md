# SceneFlow

**AI 视觉内容生产工作台 —— 让创意从架构到交付全程可视化**

SceneFlow 是一款面向专业创作者的 AI 工作流编排工具。它打破传统生图工具的"黑盒"模式，将生产力编排、AI 图像/视频生成、角色一致性控制、分镜规划深度整合在同一个无限画布中。

不再只是抽卡，而是像导演一样精准控制每一个画面。

![SceneFlow Demo](web/public/showcase/visual-workflow-canvas.png)

## ✨ 核心能力

- **🎬 无限画布 + 节点式编排**：拖拽节点、自由连线，将复杂的 Prompt 工程与后期处理拆解为可视化工作流，逻辑清晰、复用性强。
- **🎥 影视级分镜规划**：从文字剧本到分镜表，再到镜头级具体生成，支持图生视频、文生视频及片段剪辑，一站式完成短片制作。
- **🎭 角色一致性控制**：内置角色管理模块，通过三视图锁定与特征提取，解决 AI 绘图"脸盲"痛点，确保多场景下角色高度统一。
- **🧠 智能辅助创作**：集成 AI Agent 对话助手，自动拆解剧本、优化提示词；内置提示词库与素材库。
- **🔌 平台统一模型接入**：上游模型密钥由平台统一管理（AES-256-GCM 加密入库，永不下发客户端），图片 / 视频 / 文本 / 音频模型在后台一键配置，前端模型选项自动同步，不被单一平台绑定。
- **💎 积分制计费**：充值积分、按次扣费，图片按张、视频按条、音频按次；账单与积分流水透明可查，定价后台可配置。

## 🚀 快速开始

本项目采用现代化全栈架构，部署简单，开箱即用。

### 1. 环境准备

确保已安装 Node.js（推荐 v18+）和 PostgreSQL 数据库。

### 2. 安装依赖

```bash
cd web
npm install
```

### 3. 配置环境变量

在 `web/` 目录下创建 `.env`（可参考仓库根目录的 `.env.example`），填入数据库连接与平台密钥加密口令：

```bash
# 在 web/ 目录下编辑 .env
# 必填：数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/sceneflow"

# 必填：平台密钥加密口令（AES-256-GCM 派生密钥，用于加密 ProviderCredential 中的上游 Key）
# 生成方式：openssl rand -hex 32
PLATFORM_KEY_ENCRYPTION_SECRET=xxxxxxxxxxxxxxxx
```

> 平台采用「统一 Key + 积分制」：上游模型 Key 由管理员在后台「平台密钥」统一配置（加密入库、永不下发客户端），用户无需自行配置模型，充值积分按次扣费。

### 4. 迁移数据库

```bash
cd web
npx prisma migrate deploy   # 应用 migrations/ 下的离线迁移
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可开始体验。首次使用请注册账号，并联系管理员在后台「平台密钥」配置可用的上游模型。

## 🛠️ 技术栈

- **前端**：Next.js 16, React 19, TypeScript, Tailwind CSS, Ant Design
- **后端**：Next.js API Routes, Prisma 7, PostgreSQL
- **认证**：JWT + GitHub OAuth / 邮箱验证码
- **存储**：IndexedDB（本地缓存）

## 📄 开源协议

本项目基于 AGPL-3.0 协议开源。这意味着你可以自由使用和学习，但任何基于本项目的网络服务分发也必须开源。商业授权请联系作者。
