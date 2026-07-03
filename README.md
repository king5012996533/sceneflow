<p align="center">
  <img src="web/public/logo.svg" width="96" alt="SceneFlow logo">
</p>

<h1 align="center">SceneFlow</h1>

<p align="center">
  AI 视觉内容生产工作台 — 画布编排、图片生成、视频创作、角色设定、分镜规划
</p>

## 简介

SceneFlow 是一款基于画布的 AI 视觉内容生产工具。它把画布编排、AI 图片生成、视频生成、角色管理、分镜规划、对话助手、提示词库和素材沉淀放在同一个空间里，让创意从构思到交付全程可视化。

## 功能

- **画布编排**：无限画布，拖拽节点，连线关系，自由布局
- **图片生成**：支持多模型、多尺寸、参考图、批量生成
- **视频创作**：图生视频、文生视频、片段剪辑
- **角色管理**：角色设定、三视图、一致性控制
- **分镜规划**：从剧本到分镜表，镜头级别规划
- **对话助手**：AI Agent 辅助创作，自动规划流程
- **素材库**：分类存储、授权管理、跨项目复用
- **提示词库**：内置提示词中心，按标签和分类检索

## 快速开始

```bash
cd web
npm install
npm run dev
```

首次打开后进入右上角配置，填入你的 AI API Key（支持 OpenAI、DeepSeek、Gemini 等兼容接口）。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS、Ant Design
- 后端：Next.js API Routes、Prisma 7、PostgreSQL
- 认证：JWT + 邮箱/手机验证码 + GitHub OAuth
- 存储：浏览器 IndexedDB + 云端同步
