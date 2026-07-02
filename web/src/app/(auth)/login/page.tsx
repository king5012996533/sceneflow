"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input } from "antd";
import { MailOutlined, LockOutlined, GithubOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useUserStore } from "@/stores/use-user-store";

const PHONE_REGEX = /^1\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const fetchSession = useUserStore((s) => s.fetchSession);
  const from = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") || "/canvas" : "/canvas";

  const [target, setTarget] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const isPhone = PHONE_REGEX.test(target);
  const isEmail = EMAIL_REGEX.test(target);

  const handleSendCode = async () => {
    if (!target) { message.warning("请输入手机号"); return; }
    if (!isPhone) { message.warning("请输入正确的手机号"); return; }
    setLoading(true);
    try {
      const res = await fetch("/canvas/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, method: "phone" }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "发送失败"); return; }
      message.success("验证码已发送");
      setCountdown(60);
    } catch { message.error("网络错误"); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!target) { message.warning("请输入邮箱或手机号"); return; }
    setLoading(true);
    try {
      let res;
      if (isPhone) {
        if (!code || !/^\d{4,6}$/.test(code)) { message.warning("请输入验证码"); setLoading(false); return; }
        res = await fetch("/canvas/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: target, code }),
        });
      } else {
        if (!password) { message.warning("请输入密码"); setLoading(false); return; }
        res = await fetch("/canvas/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target, password }),
        });
      }
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "登录失败"); return; }
      message.success("登录成功");
      await fetchSession();
      router.push(from);
    } catch { message.error("网络错误"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">登录</h1>
          <p className="text-sm text-gray-500 mt-2">登录以同步你的画布数据</p>
        </div>

        <div className="space-y-3">
          <Input size="large" prefix={<MailOutlined />} placeholder="邮箱 / 手机号" value={target} onChange={e => setTarget(e.target.value)} onPressEnter={handleLogin} />
          {isPhone ? (
            <div className="flex gap-2">
              <Input size="large" placeholder="验证码" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onPressEnter={handleLogin} maxLength={6} />
              <Button size="large" disabled={countdown > 0} onClick={handleSendCode} loading={loading && !code} className="!shrink-0">
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          ) : (
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} onPressEnter={handleLogin} />
          )}
          <Button type="primary" size="large" block loading={loading} onClick={handleLogin} className="!rounded-lg !h-11 !font-medium">
            登录
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">或者</span></div>
          </div>
          <Button size="large" block icon={<GithubOutlined />} onClick={() => { window.location.href = "/canvas/api/auth/github"; }} className="!rounded-lg !h-11">
            使用 GitHub 登录
          </Button>
          <div className="mt-4 text-center">
            <button onClick={() => router.push("/canvas/register")} className="text-sm text-gray-500 hover:text-gray-700">
              没有账号？去注册
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
