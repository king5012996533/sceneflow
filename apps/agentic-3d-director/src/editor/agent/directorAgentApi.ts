export interface DirectorAgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DirectorAgentChatResult {
  message: string;
  commands: Array<{ name: string; ok: boolean; error?: string }>;
}

export async function sendDirectorAgentMessage(messages: DirectorAgentMessage[]) {
  const response = await fetch("/api/director-agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: DirectorAgentChatResult;
    error?: string;
  };

  if (!response.ok || !body.ok || !body.result) {
    throw new Error(body.error ?? "导演助手暂时不可用，请确认本机 Agent 服务已启动");
  }

  return body.result;
}
