# 3D Director Integration

SceneFlow vendors the 3D Director app at `apps/agentic-3d-director`.

The first integration stage keeps it as an independent Vite app and embeds it from the SceneFlow canvas with the `DirectorShot` node. This avoids coupling the Three.js/R3F runtime into the Next.js bundle while we validate the product workflow.

## Local Development

From `web`:

```bash
npm run director:dev
npm run director:agent
npm run dev
```

Default ports:

- SceneFlow web: `http://127.0.0.1:3000`
- 3D Director web: `http://127.0.0.1:5173`
- 3D Director agent service: `http://127.0.0.1:4319`

SceneFlow uses `NEXT_PUBLIC_DIRECTOR_DESK_URL` when set. If it is not set, it falls back to `http://127.0.0.1:5173/`.

## Host Bridge

SceneFlow opens the Director in an iframe and passes:

- `theme`
- `hostOrigin`
- `storyai:director-desk-session` with a per-node `instanceId`

The Director can post back:

- `storyai:director-desk-ready`
- `storyai:director-desk-close`
- `storyai:director-desk-captures-sent`

`storyai:director-desk-captures-sent` creates SceneFlow image nodes and connects them to the source `DirectorShot` node.

## Current Boundary

The Director remains a separate app under `apps/agentic-3d-director`. The next stage is to replace the external iframe URL with a hosted internal route or deployment target, then gradually extract shared schema/adapters into SceneFlow.
