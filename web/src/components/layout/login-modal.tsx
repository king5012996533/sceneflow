"use client";

import { useEffect, useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { MailOutlined, LockOutlined, SendOutlined, CheckCircleOutlined, GithubOutlined } from "@ant-design/icons";
import { useUserStore } from "@/stores/use-user-store";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const PHONE_REGEX = /^1\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { message } = App.useApp();
  const fetchSession = useUserStore((s) => s.fetchSession);

  // 模式：login | register
  const [mode, setMode] = useState<"login" | "register">("login");
  // 注册步骤：1=输入目标 → 2=输入验证码 → 3=设置密码
  const [step, setStep] = useState(1);

  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyToken, setVerifyToken] = useState("");

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const isPhone = PHONE_REGEX.test(target);
  const isEmail = EMAIL_REGEX.test(target);
  const method = isPhone ? "phone" : "email";

  const resetState = () => {
    setMode("login");
    setStep(1);
    setTarget("");
    setCode("");
    setPassword("");
    setName("");
    setLoading(false);
    setCountdown(0);
    setVerifyToken("");
  };

  const handleAfterClose = () => resetState();

  // === 登录 ===
  const handleLogin = async () => {
    if (!target) { message.warning("请输入邮箱或手机号"); return; }
    setLoading(true);
    try {
      if (isPhone) {
        // 手机号需要验证码登录
        if (!code) { message.warning("请输入验证码"); setLoading(false); return; }
        const res = await fetch("/canvas/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: target, code }),
        });
        const data = await res.json();
        if (!res.ok) { message.error(data.error || "登录失败"); return; }
        message.success("登录成功");
        await fetchSession();
        onClose();
        onSuccess?.();
      } else {
        // 邮箱密码登录
        if (!password) { message.warning("请输入密码"); setLoading(false); return; }
        const res = await fetch("/canvas/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target, password }),
        });
        const data = await res.json();
        if (!res.ok) { message.error(data.error || "登录失败"); return; }
        message.success("登录成功");
        await fetchSession();
        onClose();
        onSuccess?.();
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  // === 注册：发送验证码 ===
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

  // === 注册：校验验证码 ===
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) { message.warning("请输入6位验证码"); return; }
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

  // === 注册：完成注册 ===
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
      onClose();
      onSuccess?.();
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  // === GitHub 登录 ===
  const handleGitHub = () => {
    window.location.href = "/canvas/api/auth/github";
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
          {mode === "register" ? (step === 1 ? "注册账号" : step === 2 ? "输入验证码" : "设置密码") : "登录"}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          {mode === "register"
            ? step === 1 ? "注册后开始使用 SceneFlow" : step === 2 ? `验证码已发送至 ${target}` : "设置密码完成注册"
            : "登录以同步你的画布数据"}
        </p>
      </div>

      {/* ===== 登录模式 ===== */}
      {mode === "login" && (
        <div className="space-y-3">
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="邮箱 / 手机号"
            value={target}
            onChange={(e) => { setTarget(e.target.value); setCode(""); }}
            onPressEnter={handleLogin}
          />
          {isPhone ? (
            <div className="flex gap-2">
              <Input
                size="large"
                placeholder="验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onPressEnter={handleLogin}
                maxLength={6}
              />
              <Button
                size="large"
                disabled={countdown > 0}
                onClick={handleSendCode}
                loading={loading && !code}
                className="!shrink-0"
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          ) : (
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleLogin}
            />
          )}
          <Button type="primary" size="large" block loading={loading} onClick={handleLogin} className="!rounded-lg !h-11 !font-medium">
            登录
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-800 px-2 text-gray-400">或者</span></div>
          </div>
          <Button size="large" block icon={<GithubOutlined />} onClick={handleGitHub} className="!rounded-lg !h-11">
            使用 GitHub 登录
          </Button>
          <div className="mt-4 text-center">
            <button onClick={() => { setMode("register"); setStep(1); }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              没有账号？去注册
            </button>
          </div>
        </div>
      )}

      {/* ===== 注册模式 ===== */}
      {mode === "register" && (
        <div className="space-y-3">
          {/* 步骤1：输入邮箱/手机号 */}
          {step === 1 && (
            <>
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="邮箱 / 手机号"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onPressEnter={handleSendCode}
              />
              <Button type="primary" size="large" block loading={loading} onClick={handleSendCode} className="!rounded-lg !h-11 !font-medium">
                发送验证码
              </Button>
            </>
          )}

          {/* 步骤2：输入验证码 */}
          {step === 2 && (
            <>
              <Input
                size="large"
                placeholder="6位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onPressEnter={handleVerifyCode}
                maxLength={6}
                prefix={<CheckCircleOutlined />}
              />
              <Button type="primary" size="large" block loading={loading} onClick={handleVerifyCode} className="!rounded-lg !h-11 !font-medium">
                验证
              </Button>
              <div className="text-center">
                <button
                  onClick={() => { if (countdown <= 0) handleSendCode(); }}
                  disabled={countdown > 0}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  {countdown > 0 ? `${countdown}s 后可重发` : "重新发送验证码"}
                </button>
              </div>
            </>
          )}

          {/* 步骤3：设置密码 */}
          {step === 3 && (
            <>
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="昵称（可选）"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={handleRegister}
              />
              <Button type="primary" size="large" block loading={loading} onClick={handleRegister} className="!rounded-lg !h-11 !font-medium">
                注册
              </Button>
            </>
          )}

          <div className="mt-4 text-center">
            <button onClick={() => { setMode("login"); setStep(1); }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              已有账号？去登录
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
