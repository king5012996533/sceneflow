"use client";

import { useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useUserStore } from "@/stores/use-user-store";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { message } = App.useApp();
  const fetchSession = useUserStore((s) => s.fetchSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      message.warning("请输入邮箱和密码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || "操作失败");
        return;
      }
      message.success(mode === "register" ? "注册成功" : "登录成功");
      await fetchSession();
      onClose();
      onSuccess?.();
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleAfterClose = () => {
    setEmail("");
    setPassword("");
    setName("");
    setMode("login");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterClose={handleAfterClose}
      footer={null}
      width={380}
      centered
      styles={{ body: { padding: "32px 28px 24px" } }}
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {mode === "register" ? "创建账号" : "登录"}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          {mode === "register" ? "注册后开始使用 SceneFlow" : "登录以同步你的画布数据"}
        </p>
      </div>

      <div className="space-y-3">
        {mode === "register" && (
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="昵称（可选）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleSubmit}
          />
        )}
        <Input
          size="large"
          prefix={<MailOutlined />}
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onPressEnter={handleSubmit}
        />
        <Input.Password
          size="large"
          prefix={<LockOutlined />}
          placeholder={mode === "register" ? "密码（至少6位）" : "密码"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleSubmit}
        />
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleSubmit}
          className="!rounded-lg !h-11 !font-medium"
        >
          {mode === "register" ? "注册" : "登录"}
        </Button>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
        </button>
      </div>
    </Modal>
  );
}
