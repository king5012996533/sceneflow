"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { useUserStore } from "@/stores/use-user-store";

const PHONE_REGEX = /^1\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function IconEye() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function IconEyeOff() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconShield() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function IconGithub() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.14c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const fetchSession = useUserStore((s) => s.fetchSession);
    const from = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") || "/canvas/canvas" : "/canvas/canvas";

    const [target, setTarget] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const isPhone = PHONE_REGEX.test(target);

    const handleSendCode = async () => {
        if (!target) {
            setFeedback({ text: "请输入手机号", error: true });
            return;
        }
        if (!isPhone) {
            setFeedback({ text: "请输入正确的手机号", error: true });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/canvas/api/auth/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target, method: "phone" }),
            });
            const data = await res.json();
            if (!res.ok) {
                setFeedback({ text: data.error || "发送失败", error: true });
                return;
            }
            message.success("验证码已发送");
            setFeedback(null);
            setCountdown(60);
        } catch {
            setFeedback({ text: "网络错误", error: true });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!target) {
            setFeedback({ text: "请输入邮箱或手机号", error: true });
            return;
        }
        setLoading(true);
        try {
            let res;
            if (isPhone) {
                if (!code || !/^\d{4,6}$/.test(code)) {
                    setFeedback({ text: "请输入验证码", error: true });
                    setLoading(false);
                    return;
                }
                res = await fetch("/canvas/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: target, code }),
                });
            } else {
                if (!password) {
                    setFeedback({ text: "请输入密码", error: true });
                    setLoading(false);
                    return;
                }
                res = await fetch("/canvas/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: target, password }),
                });
            }
            const data = await res.json();
            if (!res.ok) {
                setFeedback({ text: data.error || "登录失败", error: true });
                return;
            }
            setFeedback({ text: "验证通过，正在安全登录…", error: false });
            await fetchSession();
            router.push(from);
        } catch {
            setFeedback({ text: "网络错误", error: true });
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = () => {
        setFeedback({ text: "请输入邮箱地址，我们会发送密码重置链接。", error: false });
        document.getElementById("sf-login-target")?.focus();
    };

    return (
        <main className="sf-login-page">
            <section className="sf-login-intro">
                <div className="sf-login-brand">
                    <span className="sf-login-mark">S</span>
                    <span>SCENEFLOW</span>
                </div>
                <div className="sf-login-copy">
                    <p className="sf-login-eyebrow">AI VISUAL PRODUCTION / 2026</p>
                    <h1>
                        让每一个创意，
                        <br />
                        抵达画面。
                    </h1>
                    <p>从剧本、角色、分镜到关键帧与视频，把每一次创作沉淀为可复用的视觉资产。</p>
                </div>
                <div className="sf-login-footer">
                    <span>© 2026 SCENEFLOW</span>
                    <span className="sf-login-secure">
                        <IconShield />
                        受加密连接保护
                    </span>
                </div>
            </section>

            <section className="sf-login-shell">
                <div className="sf-login-card">
                    <div className="sf-login-brand sf-login-brand-mobile">
                        <span className="sf-login-mark">S</span>
                        <span>SCENEFLOW</span>
                    </div>

                    <header className="sf-login-header">
                        <h2>欢迎回来</h2>
                        <p className="sf-login-subtitle">登录以继续你的创作旅程。</p>
                    </header>

                    <button
                        className="sf-login-social"
                        type="button"
                        onClick={() => {
                            window.location.href = "/canvas/api/auth/github";
                        }}
                    >
                        <IconGithub />
                        使用 GitHub 继续
                    </button>
                    <div className="sf-login-or" aria-hidden="true">
                        或使用邮箱 / 手机
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleLogin();
                        }}
                        noValidate
                    >
                        <div className="sf-login-field">
                            <label htmlFor="sf-login-target">邮箱地址 / 手机号</label>
                            <input id="sf-login-target" name="target" type="text" autoComplete="email" placeholder="name@company.com" value={target} onChange={(e) => setTarget(e.target.value)} required />
                        </div>

                        {isPhone ? (
                            <div className="sf-login-field">
                                <label htmlFor="sf-login-code">验证码</label>
                                <div className="sf-login-row">
                                    <input
                                        id="sf-login-code"
                                        name="code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="6 位验证码"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    />
                                    <button className="sf-login-code-btn" type="button" disabled={countdown > 0 || loading} onClick={() => void handleSendCode()}>
                                        {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="sf-login-field">
                                <label htmlFor="sf-login-password">密码</label>
                                <div className="sf-login-input-wrap">
                                    <input
                                        id="sf-login-password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="输入你的密码"
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button className="sf-login-pw-toggle" type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((v) => !v)}>
                                        {showPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="sf-login-options">
                            <label className="sf-login-check">
                                <input type="checkbox" defaultChecked />
                                <span className="sf-login-checkmark">
                                    <IconCheck />
                                </span>
                                记住我的登录状态
                            </label>
                            <button type="button" className="sf-login-link" onClick={handleForgot}>
                                忘记密码？
                            </button>
                        </div>

                        <button className="sf-login-submit" type="submit" disabled={loading}>
                            {loading ? "登录中…" : "登录"}
                        </button>
                    </form>

                    {feedback ? (
                        <p className={`sf-login-feedback${feedback.error ? " error" : ""}`} role="status" aria-live="polite">
                            {feedback.text}
                        </p>
                    ) : (
                        <p className="sf-login-feedback" role="status" aria-live="polite" />
                    )}

                    <p className="sf-login-signup">
                        还没有账户？
                        <button type="button" className="sf-login-link" onClick={() => router.push("/register")}>
                            创建账户
                        </button>
                    </p>
                </div>
            </section>
        </main>
    );
}
