import { ArrowUp, CircleAlert, GripHorizontal, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendDirectorAgentMessage, type DirectorAgentMessage } from "./directorAgentApi";
import {
  DIRECTOR_AGENT_STATUS_EVENT,
  getDirectorAgentConnectionStatus,
  type DirectorAgentConnectionStatus,
} from "./directorAgentBrowserBridge";

const SUGGESTIONS = [
  "读取当前场景，概括人物、道具和机位布局",
  "新增一男一女两个角色，分别放在画面左右并让他们面向彼此",
  "给当前角色应用思考姿势，并把机位调整为中景构图",
  "检查当前工程里的无效引用和机位问题",
];

const PANEL_VIEWPORT_MARGIN = 8;
const COMPACT_PANEL_MAX_WIDTH = 720;

export type DirectorAgentPanelOffset = { x: number; y: number };

type PanelDragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  if (maximum < minimum) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function connectionLabel(status: DirectorAgentConnectionStatus) {
  if (status === "connected") return "已连接当前导演工程";
  if (status === "connecting") return "正在连接本机 Agent 服务";
  return "本机 Agent 服务未连接";
}

export function DirectorAgentDrawer({
  onClose,
  panelOffset,
  onPanelOffsetChange,
}: {
  onClose: () => void;
  panelOffset: DirectorAgentPanelOffset;
  onPanelOffsetChange: (offset: DirectorAgentPanelOffset) => void;
}) {
  const [messages, setMessages] = useState<DirectorAgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(getDirectorAgentConnectionStatus());
  const [panelDragging, setPanelDragging] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const panelDragStateRef = useRef<PanelDragState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const handleStatus = (event: Event) => {
      setConnectionStatus((event as CustomEvent<DirectorAgentConnectionStatus>).detail);
    };
    window.addEventListener(DIRECTOR_AGENT_STATUS_EVENT, handleStatus);
    return () => window.removeEventListener(DIRECTOR_AGENT_STATUS_EVENT, handleStatus);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, error]);

  useEffect(() => {
    if (!panelDragging) return;

    function handleMouseMove(event: MouseEvent) {
      const dragState = panelDragStateRef.current;
      if (!dragState) return;
      const minimumX = PANEL_VIEWPORT_MARGIN - dragState.baseLeft;
      const maximumX = window.innerWidth - PANEL_VIEWPORT_MARGIN - dragState.width - dragState.baseLeft;
      const minimumY = PANEL_VIEWPORT_MARGIN - dragState.baseTop;
      const maximumY = window.innerHeight - PANEL_VIEWPORT_MARGIN - dragState.height - dragState.baseTop;

      onPanelOffsetChange({
        x: clamp(dragState.originX + event.clientX - dragState.startX, minimumX, maximumX),
        y: clamp(dragState.originY + event.clientY - dragState.startY, minimumY, maximumY),
      });
    }

    function handleMouseUp() {
      panelDragStateRef.current = null;
      setPanelDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onPanelOffsetChange, panelDragging]);

  useEffect(() => {
    function keepPanelInViewport() {
      const panel = panelRef.current;
      if (!panel || window.innerWidth <= COMPACT_PANEL_MAX_WIDTH) return;
      const rect = panel.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const correctionX = rect.left < PANEL_VIEWPORT_MARGIN
        ? PANEL_VIEWPORT_MARGIN - rect.left
        : rect.right > window.innerWidth - PANEL_VIEWPORT_MARGIN
          ? window.innerWidth - PANEL_VIEWPORT_MARGIN - rect.right
          : 0;
      const correctionY = rect.top < PANEL_VIEWPORT_MARGIN
        ? PANEL_VIEWPORT_MARGIN - rect.top
        : rect.bottom > window.innerHeight - PANEL_VIEWPORT_MARGIN
          ? window.innerHeight - PANEL_VIEWPORT_MARGIN - rect.bottom
          : 0;
      if (correctionX !== 0 || correctionY !== 0) {
        onPanelOffsetChange({ x: panelOffset.x + correctionX, y: panelOffset.y + correctionY });
      }
    }

    keepPanelInViewport();
    window.addEventListener("resize", keepPanelInViewport);
    return () => window.removeEventListener("resize", keepPanelInViewport);
  }, [onPanelOffsetChange, panelOffset]);

  function handlePanelDragStart(event: React.MouseEvent<HTMLElement>) {
    if (event.button !== 0 || window.innerWidth <= COMPACT_PANEL_MAX_WIDTH) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select, a")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    event.preventDefault();
    panelDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panelOffset.x,
      originY: panelOffset.y,
      baseLeft: rect.left - panelOffset.x,
      baseTop: rect.top - panelOffset.y,
      width: rect.width,
      height: rect.height,
    };
    setPanelDragging(true);
  }

  async function send(draft?: string) {
    const content = (draft ?? input).trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const result = await sendDirectorAgentMessage(nextMessages);
      const failures = result.commands.filter((item) => !item.ok);
      const failureText = failures.length
        ? `\n\n未完成：${failures.map((item) => `${item.name}（${item.error ?? "执行失败"}）`).join("；")}`
        : "";
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `${result.message}${failureText}` },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      ref={panelRef}
      className={`director-agent-drawer${panelDragging ? " is-dragging" : ""}`}
      aria-label="导演助手"
      style={{ transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)` }}
    >
      <header
        className="director-agent-header"
        aria-label="拖动导演助手面板"
        title="按住并拖动面板"
        onMouseDown={handlePanelDragStart}
      >
        <div className="director-agent-heading">
          <span className="director-agent-logo"><Sparkles aria-hidden="true" size={16} /></span>
          <span>
            <strong>导演助手</strong>
            <small data-status={connectionStatus}>{connectionLabel(connectionStatus)}</small>
          </span>
        </div>
        <div className="director-agent-header-actions">
          <GripHorizontal className="director-agent-drag-grip" aria-hidden="true" size={16} />
          <button className="director-agent-icon-button" type="button" aria-label="关闭导演助手" onClick={onClose}>
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      </header>

      <div ref={listRef} className={`director-agent-messages${messages.length === 0 ? " is-empty" : ""}`}>
        {messages.length === 0 && (
          <div className="director-agent-welcome">
            <span className="director-agent-eyebrow">自然语言导演台</span>
            <h2>告诉我人物怎么站、镜头怎么看</h2>
            <p>我会先读取当前工程，使用真实对象 ID 执行语义操作，并保护你手工锁定的内容。</p>
            {connectionStatus === "disconnected" && (
              <div className="director-agent-connection-tip">
                <CircleAlert aria-hidden="true" size={15} />
                <span>请在项目目录运行 <code>npm run agent</code>，导演台会自动重连。</span>
              </div>
            )}
            <div className="director-agent-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`director-agent-message is-${message.role}`}>
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="director-agent-thinking">
            <LoaderCircle aria-hidden="true" className="director-agent-spin" size={15} />
            正在读取工程并规划操作…
          </div>
        )}
        {error && <div className="director-agent-error">{error}</div>}
      </div>

      <div className="director-agent-composer">
        <textarea
          ref={inputRef}
          value={input}
          placeholder="例如：让角色01站到桌子左侧，机位看向他…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <div className="director-agent-composer-footer">
          <span><ShieldCheck aria-hidden="true" size={13} />人工锁定默认受保护</span>
          <button
            type="button"
            aria-label="发送给导演助手"
            disabled={!input.trim() || loading || connectionStatus !== "connected"}
            onClick={() => void send()}
          >
            <ArrowUp aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
