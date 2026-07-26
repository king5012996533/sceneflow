# SceneFlow 漫剧模板包

## 定位

本模板包是 SceneFlow 流水线的"剧本→分镜→提示词"补充层。它不侵入流水线内核，而是提供：

1. **结构化模板** — 可被 Agent 引用以生成 SceneFlow 兼容的节点
2. **字段映射规范** — 定义漫剧创作数据如何存入 CanvasNodeMetadata
3. **Agent Prompt 构建器** — 三个入口的模板化 prompt

## 文件说明

| 文件 | 用途 |
|------|------|
| `sceneflow-manga-templates.ts` | 类型定义 + 模板常量 + Agent prompt 构建器函数 |
| `sceneflow-manga-templates.md` | 本文件，字段映射说明和使用指南 |

## 字段 → SceneFlow 节点映射

### 1. 角色卡 → CanvasNodeData.metadata

角色设定卡的每个字段映射到 CanvasNodeMetadata 的对应字段：

```typescript
node.metadata = {
  // 角色名与赛道归类
  pipelineLabel: "角色A-姓名",        // 节点标题
  pipelineKind: "power-fantasy",      // 赛道类型
  pipelineDescription: "冷峻剑客",    // 角色类型描述

  // 视觉锚点 / AI标签组 → consistencyNotes
  consistencyNotes: JSON.stringify({
    visualAnchors: {
      hair: "银色短发",
      facialFeatures: ["冰蓝色瞳孔"],
      signatureItem: "银色耳钉"
    },
    aiTags: {
      gender: "1boy",
      hair: "silver short hair",
      eyes: "ice blue eyes",
      clothing: "black long coat"
    },
    emotionExpressions: {
      anger: ["clenched jaw", "furrowed brows"],
      sweet: ["soft smile", "blushing cheeks"]
    }
  })
};
```

**对应节点类型**: Image 节点（角色参考图）、Text 节点（角色描述）

### 2. 分镜表 → CanvasShotPack

```typescript
node.metadata = {
  shotPack: {
    shots: [
      {
        id: "shot-01",
        title: "开场特写",
        description: "紧张对视，手按剑柄",
        duration: 3,
        camera: "特写",
        imageUrl: "",
      }
    ],
    layout: "vertical",
    showIndex: true,
    showCaption: true
  },
  // 额外用 pipeline 字段标记分镜所属集数
  pipelineLabel: "第1集-龙渊觉醒",
  pipelineRunStatus: "completed"
};
```

**对应节点类型**: Text 节点（存储分镜表 JSON）。通过 `metadata.shotPack` 字段系统原生支持。

### 3. 生成参数 → Config 节点

```typescript
configNode.metadata = {
  generationMode: "image",
  model: "stable-diffusion",
  size: "832x1216",
  quality: "standard",
  count: 4,         // 每组分镜生成张数
  references: [     // 角色参考图存储 key
    "image:character-a-001",
    "image:character-b-001"
  ]
};
```

**对应节点类型**: Config 节点。使用现有的 `generationMode`、`model`、`size`、`references` 字段。

### 4. Seedance 视频片段 → Video 节点

```typescript
videoNode.metadata = {
  prompt: "[风格/画质总纲]，@图片1 + [场景环境]\n\n0-3秒：...",
  model: "seedance-2",
  seconds: "15",
  pipelineLabel: "第1段-开局长镜头",
  consistencyNotes: JSON.stringify({
    segmentIndex: 1,
    totalSegments: 5,
    previousSegment: "@视频1",
    transitionDescription: "上一段结尾角色背对镜头"
  })
};
```

**对应节点类型**: Video 节点。`prompt` 存中文提示词，`seconds` 控制时长，`consistencyNotes` 存分段衔接信息。

## 三个入口的使用方式

### 入口1: 短剧 → 漫剧

调用 `buildShortVideoToMangaPrompt(existingScript)` 生成 Agent prompt →
Agent 输出 → 创建 Text 节点（剧本）+ Config 节点（参数）

### 入口2: 小说片段 → 分镜表

调用 `buildNovelToStoryboardPrompt(excerpt)` 生成 Agent prompt →
Agent 输出 → 填充 `metadata.shotPack.shots` → 创建 Text 节点

### 入口3: 角色设定 + 梗概 → 分集脚本

调用 `buildOutlineToEpisodePrompt(梗概, characterCards)` 生成 Agent prompt →
Agent 输出 → 创建一列 Text 节点（每集一个）+ 分镜节点

## 接入原则

1. **只引用类型和常量，不要依赖运行时 hook**
2. Agent 在生成节点时用模板做"指导"而非"强制"
3. 所有模板数据都是建议值，用户可以手动编辑
4. 新加的内容都放在 `metadata` 里，不需要改动节点类型系统
