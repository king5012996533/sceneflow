"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input } from "antd";
import { MailOutlined, LockOutlined, UserOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useUserStore } from "@/stores/use-user-store";

const PHONE_REGEX = /^1\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const fetchSession = useUserStore((s) => s.fetchSession);

  const [step, setStep] = useState(1);
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyToken, setVerifyToken] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const isPhone = PHONE_REGEX.test(target);
  const isEmail = EMAIL_REGEX.test(target);
  const method = isPhone ? "phone" : "email";

  const handleSendCode = async () => {
    if (!target) { message.warning("请输入邮箱或手机号"); return; }
    if (!isEmail && !isPhone) { message.warning("请输入有效的邮箱或手机号"); return; }
    setLoading(true);
    try {
      const res = await fetch("/canvas/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, method }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "发送失败"); return; }
      message.success("验证码已发送");
      setCountdown(60);
      setStep(2);
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || !/^\d{4,6}$/.test(code)) { message.warning("请输入4-6位验证码"); return; }
    setLoading(true);
    try {
      const res = await fetch("/canvas/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, method, code }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "验证码错误"); return; }
      setVerifyToken(data.token);
      setStep(3);
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!password || password.length < 6) { message.warning("密码至少6位"); return; }
    setLoading(true);
    try {
      const res = await fetch("/canvas/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: isPhone ? `${target}@phone.local` : target, password, name, verificationToken: verifyToken }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "注册失败"); return; }
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
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? "注册账号" : step === 2 ? "输入验证码" : "设置密码"}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === 1 ? "注册后开始使用 SceneFlow" : step === 2 ? `验证码已发送至 ${target}` : "设置密码完成注册"}
          </p>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <Input size="large" prefix={<MailOutlined />} placeholder="邮箱 / 手机号" value={target} onChange={e => setTarget(e.target.value)} onPressEnter={handleSendCode} />
              <Button type="primary" size="large" block loading={loading} onClick={handleSendCode} className="!rounded-xl !h-11 !font-medium">发送验证码</Button>
            </>
          )}

          {step === 2 && (
            <>
              <Input size="large" prefix={<CheckCircleOutlined />} placeholder="4-6位验证码" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onPressEnter={handleVerifyCode} maxLength={6} />
              <Button type="primary" size="large" block loading={loading} onClick={handleVerifyCode} className="!rounded-xl !h-11 !font-medium">验证</Button>
              <div className="text-center">
                <button onClick={() => { if (countdown <= 0) handleSendCode(); }} disabled={countdown > 0} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
                  {countdown > 0 ? `${countdown}s 后可重发` : "重新发送验证码"}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Input size="large" prefix={<UserOutlined />} placeholder="昵称（可选）" value={name} onChange={e => setName(e.target.value)} />
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="密码（至少6位）" value={password} onChange={e => setPassword(e.target.value)} onPressEnter={handleRegister} />
              <Button type="primary" size="large" block loading={loading} onClick={handleRegister} className="!rounded-xl !h-11 !font-medium">注册</Button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => router.push("/canvas/login")} className="text-sm text-gray-500 hover:text-gray-700">已有账号？去登录</button>
        </div>
      </div>
    </div>
  );
}
