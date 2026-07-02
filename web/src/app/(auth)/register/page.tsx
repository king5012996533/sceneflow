"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useUserStore } from "@/stores/use-user-store";

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const fetchSession = useUserStore((s) => s.fetchSession);
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || "注册失败");
        return;
      }
      message.success("注册成功");
      await fetchSession();
      router.push("/canvas");
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
          <p className="text-sm text-gray-500 mt-2">注册后开始使用画布工作台</p>
        </div>

        <div className="space-y-4">
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="昵称（可选）"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="密码（至少6位）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleSubmit}
            className="!rounded-xl !h-11 !font-medium"
          >
            注册
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            已有账号？去登录
          </button>
        </div>
      </div>
    </div>
  );
}
