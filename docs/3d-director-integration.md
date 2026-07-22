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

## Production Build

For a single SceneFlow deployment, build and copy the vendored Director app into Next.js public assets:

```bash
cd web
npm run build:with-director
```

Set:

```bash
NEXT_PUBLIC_DIRECTOR_DESK_URL=/director-desk/
```

`build:with-director` runs the Director Vite build, syncs `apps/agentic-3d-director/dist` into `web/public/director-desk`, then runs `next build --webpack`. The generated `web/public/director-desk` directory is ignored by git.

## Host Bridge

SceneFlow opens the Director in an iframe and passes:

- `theme`
- `hostOrigin`
- `storyai:director-desk-session` with a per-node `instanceId` and the saved `directorProject`
- `storyai:director-desk-panorama` when an image node is connected into a `DirectorShot` node

The Director can post back:

- `storyai:director-desk-ready`
- `storyai:director-desk-close`
- `storyai:director-desk-captures-sent`
- `storyai:director-desk-project-changed`
- `storyai:director-desk-panorama-removed`

`storyai:director-desk-captures-sent` creates SceneFlow image nodes and connects them to the source `DirectorShot` node.

`storyai:director-desk-project-changed` stores the Director scene JSON in the `DirectorShot` node metadata, so reopening that node restores its 3D scene, cameras, and timeline. Binary capture data is omitted by the Director snapshot protocol; captured stills remain separate SceneFlow image nodes.

When an upstream SceneFlow image node is connected into a `DirectorShot`, SceneFlow sends it as a host panorama/background input on open. If the user removes that panorama inside Director, SceneFlow removes the matching canvas connection.

## Current Boundary

The Director remains a separate app under `apps/agentic-3d-director`. The next stage is to replace the external iframe URL with a hosted internal route or deployment target, then gradually extract shared schema/adapters into SceneFlow.
