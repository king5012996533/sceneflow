# SceneFlow

**AI 视觉内容生产工作台 —— 让创意从架构到交付全程可视化**

SceneFlow 是一款面向专业创作者的 AI 工作流编排工具。它打破了传统生图工具的"黑盒"模式，将生产力编排、AI 图像/视频生成、角色一致性控制、分镜规划深度整合在同一个无限画布中。

不再只是抽卡，而是像导演一样精准控制每一个画面。

![SceneFlow Demo](web/public/showcase/visual-workflow-canvas.png)

## ✨ 核心能力

- **🎬 节点式编排引擎**：支持拖拽节点、自由连线。将复杂的 Prompt 工程和后期处理拆解为可视化的工作流，逻辑清晰，复用性强。
- **🎭 角色一致性控制**：内置专门的角色管理模块。通过三视图锁定与特征提取，解决 AI 绘图"脸盲"痛点，确保多场景下角色高度统一。
- **🎥 影视级分镜规划**：从文字剧本到分镜表，再到镜头级别的具体生成，支持图生视频、文生视频及片段剪辑，一站式完成短片制作。
- **🧠 智能辅助创作**：集成 AI Agent 对话助手，自动拆解剧本、优化提示词；内置提示词库与素材库，支持跨项目复用与分类管理。
- **🔌 广泛的模型兼容**：支持 OpenAI、DeepSeek、Gemini 等主流模型接口，灵活切换，不被单一平台绑定。

## 🚀 快速开始

本项目采用现代化的全栈架构，部署简单，开箱即用。

### 1. 环境准备

确保已安装 Node.js (推荐 v18+) 和 PostgreSQL 数据库。

### 2. 安装依赖

```bash
cd web
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 API Key 和数据库连接字符串：

```bash
# 必填：AI 服务接口 (支持 OpenAI/DeepSeek 等兼容接口)
OPENAI_API_KEY=sk-xxxxx
OPENAI_BASE_URL=https://api.xxxx.com

# 必填：数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/sceneflow"
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可开始体验。首次使用请在右上角配置您的 API Key。

## 🛠️ 技术栈

- **前端**：Next.js 16, React 19, TypeScript, Tailwind CSS, Ant Design
- **后端**：Next.js API Routes, Prisma 7, PostgreSQL
- **认证**：JWT + GitHub OAuth / 邮箱验证码
- **存储**：IndexedDB (本地缓存) + 云端同步

## 📄 开源协议

本项目基于 AGPL-3.0 协议开源。这意味着你可以自由使用和学习，但任何基于本项目的网络服务分发也必须开源。商业授权请联系作者。
