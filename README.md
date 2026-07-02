<p align="center">
  <img src="web/public/logo.svg" width="96" alt="漫剧工厂 logo">
</p>

<h1 align="center">漫剧工厂 (Manju Factory)</h1>

<p align="center">
  AI 漫剧创作平台 — 画布编排、AI 生图、视频生成、对话创作
</p>

## 简介

漫剧工厂是一款面向 AI 漫剧创作的开源工作台。它把画布编排、AI 图片生成、视频生成、对话助手、提示词库和素材沉淀放在同一个界面里。

## 快速开始

```bash
cd web
bun install
bun run dev
```

首次打开后进入右上角配置，填入你的 OpenAI 兼容 Base URL 和 API Key。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS、Ant Design
- 存储：浏览器 IndexedDB / localStorage
