import "./styles/index.css";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { DirectorDeskShell } from "./app/layout/DirectorDeskShell";
import { DirectorAgentDrawer, type DirectorAgentPanelOffset } from "./editor/agent/DirectorAgentDrawer";
import {
  clearDirectorAgentBrowserBridge,
  initDirectorAgentBrowserBridge,
} from "./editor/agent/directorAgentBrowserBridge";
import { DirectorCanvas } from "./editor/canvas/DirectorCanvas";
import { clearDirectorDeskHostBridge, getDirectorDeskHostOrigin, initDirectorDeskHostBridge } from "./editor/io/hostBridge";
import { useDirectorStore } from "./editor/store/directorStore";
import { AnimationTimelinePanel } from "./editor/timeline/AnimationTimelinePanel";

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export default function App() {
  const viewMode = useDirectorStore((state) => state.viewMode);
  const setViewMode = useDirectorStore((state) => state.setViewMode);
  const timelinePanelOpen = useDirectorStore((state) => state.timelinePanelOpen);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentPanelOffset, setAgentPanelOffset] = useState<DirectorAgentPanelOffset>({ x: 0, y: 0 });

  useEffect(() => {
    initDirectorDeskHostBridge();
    initDirectorAgentBrowserBridge();
    window.parent?.postMessage({ type: "storyai:director-desk-ready" }, getDirectorDeskHostOrigin());

    return () => {
      clearDirectorAgentBrowserBridge();
      clearDirectorDeskHostBridge();
    };
  }, []);

  function handleClose() {
    window.parent?.postMessage({ type: "storyai:director-desk-close" }, getDirectorDeskHostOrigin());
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableShortcutTarget(event.target)) return;
      if (!event.metaKey && !event.ctrlKey) return;

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        useDirectorStore.getState().copySelectedObjects();
        return;
      }

      if (key === "v") {
        event.preventDefault();
        useDirectorStore.getState().pasteClipboardObjects();
        return;
      }

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        useDirectorStore.getState().undo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={`app-shell${timelinePanelOpen ? " is-timeline-open" : ""}`}>
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 className="top-bar-title">Agentic 3D Director</h1>
        </div>
        <div className="top-bar-center">
          <div className="mode-toggle ui-segmented" role="group" aria-label="视角切换">
            <button
              className={`mode-toggle-button ui-segmented-item ${viewMode === "director" ? "ui-segmented-item-active" : ""}`}
              aria-pressed={viewMode === "director"}
              type="button"
              onClick={() => setViewMode("director")}
            >
              导演视角
            </button>
            <button
              className={`mode-toggle-button ui-segmented-item ${viewMode === "camera" ? "ui-segmented-item-active" : ""}`}
              aria-pressed={viewMode === "camera"}
              type="button"
              onClick={() => setViewMode("camera")}
            >
              机位视角
            </button>
          </div>
        </div>
        <div className="top-bar-actions">
          <button
            className={`top-bar-agent-button${agentOpen ? " is-active" : ""}`}
            type="button"
            aria-label="导演助手"
            aria-expanded={agentOpen}
            onClick={() => setAgentOpen((open) => !open)}
          >
            <Sparkles aria-hidden="true" size={15} />
            <span>导演助手</span>
          </button>
          <button
            className="top-bar-action-button"
            type="button"
            aria-label="关闭"
            title="关闭"
            onClick={handleClose}
          >
            <X aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <DirectorDeskShell>
        <DirectorCanvas />
      </DirectorDeskShell>
      <AnimationTimelinePanel />
      {agentOpen && (
        <DirectorAgentDrawer
          onClose={() => setAgentOpen(false)}
          panelOffset={agentPanelOffset}
          onPanelOffsetChange={setAgentPanelOffset}
        />
      )}
    </div>
  );
}
