import type { Metadata } from "next";
import Link from "next/link";

import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
import { publicPath } from "@/lib/app-paths";

export const metadata: Metadata = {
    title: {
        absolute: "SceneFlow｜AI 视觉生产系统 —— 从剧本、角色到视频的无限画布",
    },
    description: "SceneFlow 是面向电商视觉、品牌内容、虚拟角色、分镜和视频创作的 AI 视觉生产系统：把提示词、参考图、角色资产、镜头规划和生成结果沉淀进同一套可持续生产的视觉画布。",
    alternates: {
        canonical: "https://xingtudesign.com/canvas",
    },
    openGraph: {
        title: "SceneFlow｜AI 视觉生产系统",
        description: "从剧本、角色、分镜到关键帧与视频，把每一次创作沉淀为可复用的视觉资产。",
        url: "https://xingtudesign.com/canvas",
        siteName: "SceneFlow",
        locale: "zh_CN",
        type: "website",
        images: [
            {
                url: "/og.png",
                width: 1200,
                height: 630,
                alt: "SceneFlow AI 视觉生产系统",
            },
        ],
    },
};

export default function Home() {
    return (
        <div className="sf-mag">
            {/* Masthead */}
            <header className="masthead">
                <div className="container masthead-inner">
                    <a className="mast-brand" href="#top" aria-label="SceneFlow 首页">
                        <span className="mast-wordmark">
                            Scene<em>Flow</em>
                        </span>
                        <span className="mast-sub">AI Visual Production System</span>
                    </a>
                    <nav className="mast-nav" aria-label="栏目导航">
                        <a href="#production">生产现场</a>
                        <a href="#assets">资产沉淀</a>
                        <a href="#applications">应用场景</a>
                        <a href="#workflow">工作流</a>
                    </nav>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <span className="mast-issue">NO. 01 · 2026</span>
                        <a className="mast-cta" href="#cta">
                            进入画布 ↗
                        </a>
                    </div>
                </div>
            </header>

            <main id="top">
                {/* Cover */}
                <section className="cover">
                    <div className="container">
                        <p className="cover-eyebrow">The Visual Production System</p>
                        <h1>
                            把创意，变成一种<span className="amp">可持续</span>的生产能力。
                        </h1>
                        <p className="cover-lead">SceneFlow 把提示词、参考图、角色资产、镜头规划与生成结果，沉淀进同一块无限画布。让每一次灵感都能被复用、被推进，也被真正留下。</p>
                        <div className="cover-actions">
                            <Link className="btn btn-primary" href="/canvas/canvas">
                                进入生产画布 ↗
                            </Link>
                            <Link className="btn btn-ghost" href="/pricing">
                                充值积分 ↗
                            </Link>
                        </div>

                        <figure className="cover-photo">
                            <div className="cover-photo-frame">
                                <img src={publicPath("/landing/hero-keyframe.webp")} alt="雨后青竹林的电影关键帧：剑身水痕推向角色侧脸" />
                            </div>
                            <figcaption className="cover-photo-caption">
                                <span>Scene 08 — KEYFRAME / 35mm</span>
                                <i>雨后的青竹林。镜头从剑身水痕，推向角色侧脸。</i>
                            </figcaption>
                        </figure>

                        <div className="metrics">
                            <div className="metric">
                                <b>
                                    80+<small> 人</small>
                                </b>
                                <span>真实创作者参与内测</span>
                            </div>
                            <div className="metric">
                                <b>
                                    ONE<small> CANVAS</small>
                                </b>
                                <span>从灵感到成片的统一画布</span>
                            </div>
                            <div className="metric">
                                <b>
                                    ASSET<small> MEMORY</small>
                                </b>
                                <span>角色、场景与流程持续沉淀</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 01: Production */}
                <section id="production" className="section section-alt">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Feature 01 — Production</p>
                                <h2 className="section-title">
                                    一块画布，装下整条<em>视觉生产链</em>。
                                </h2>
                                <p className="section-lede">不是又一个生成器，而是一套把导演判断、角色连续性和镜头推进都放在同一现场的生产系统。</p>
                            </div>
                            <span className="section-num">Issue 01 / pp. 06–09</span>
                        </div>

                        <div className="prod-grid">
                            <div>
                                <figure className="prod-photo-frame">
                                    <img src={publicPath("/landing/shot-large.webp")} alt="雨夜竹林中的孤影全景" />
                                </figure>
                                <figcaption className="prod-caption">
                                    <span>Shot 08 — Wide</span>
                                    <i>雾起竹林。一个背影走进雨幕。</i>
                                </figcaption>
                                <div className="stat-row">
                                    <div className="stat">
                                        <b>98.7%</b>
                                        <span>IDENTITY LOCK · 角色身份锁定</span>
                                    </div>
                                    <div className="stat">
                                        <b>16:9</b>
                                        <span>SHOT 08 / 16 · 35mm 镜头语言</span>
                                    </div>
                                </div>
                            </div>

                            <aside className="notes">
                                <div className="note-item">
                                    <b>AI Director / 现场记录</b>
                                    <p>
                                        当前镜头：<strong>雨后的青竹林</strong>。镜头从剑身水痕推向角色侧脸，衣袂被风带起。导演意图、参考图与生成结果在同一视口，随时改，随时重来。
                                    </p>
                                </div>
                                <div className="note-item">
                                    <b>Production Online</b>
                                    <p>
                                        状态：<strong>production online</strong>。镜头与叙事信息作为项目资产随项目沉淀，下一场拍摄不必从零开始。
                                    </p>
                                </div>
                                <figure style={{ margin: "22px 0 0" }}>
                                    <div className="prod-photo-frame" style={{ aspectRatio: "4/3" }}>
                                        <img src={publicPath("/landing/shot-small.webp")} alt="角色侧脸特写，雨滴在脸颊" />
                                    </div>
                                    <figcaption className="prod-caption" style={{ marginTop: 10 }}>
                                        <span>Detail — 4:3</span>
                                        <i>角色侧脸特写，身份持续锁定。</i>
                                    </figcaption>
                                </figure>
                            </aside>
                        </div>
                    </div>
                </section>

                {/* Feature 02: Asset Memory */}
                <section id="assets" className="section">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Feature 02 — Asset Memory</p>
                                <h2 className="section-title">
                                    模型会更新。<em>真正留下来的</em>，是你的角色、流程与作品资产。
                                </h2>
                            </div>
                            <span className="section-num">Issue 01 / pp. 10–13</span>
                        </div>

                        <div className="asset-grid">
                            <div className="asset-copy">
                                <p className="lead">
                                    把生产过程中的关键判断，变成<em>可检索、可复用</em>的视觉资产。
                                </p>
                                <p>每一次生成都不再是一次性的。身份、场景、镜头与经验被结构化地留在画布里，成为下一次生产的起点。</p>
                                <ul className="asset-list">
                                    <li>
                                        <b>角色</b>角色身份与三视图，持续锁定
                                    </li>
                                    <li>
                                        <b>场景</b>世界设定与场景关系，统一空间
                                    </li>
                                    <li>
                                        <b>镜头</b>镜头语言与分镜模板，随项目沉淀
                                    </li>
                                    <li>
                                        <b>经验</b>项目经验与生成结果，可追溯复用
                                    </li>
                                </ul>
                            </div>
                            <div className="asset-plates">
                                <figure className="plate">
                                    <span className="plate-fig">Fig. 01 — Character Sheet</span>
                                    <div className="plate-frame">
                                        <img src={publicPath("/landing/asset-character.webp")} alt="雨夜角色三视图设定稿" />
                                    </div>
                                    <figcaption className="plate-caption">
                                        <span>Character / 01</span>
                                        <i>雨夜角色 · 三视图</i>
                                    </figcaption>
                                </figure>
                                <figure className="plate">
                                    <span className="plate-fig">Fig. 02 — World Setting</span>
                                    <div className="plate-frame">
                                        <img src={publicPath("/landing/asset-world.webp")} alt="青竹林世界概念设定" />
                                    </div>
                                    <figcaption className="plate-caption">
                                        <span>World / 07</span>
                                        <i>青竹林 · 世界设定</i>
                                    </figcaption>
                                </figure>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Applications */}
                <section id="applications" className="section section-alt">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Applications</p>
                                <h2 className="section-title">
                                    同一套生产能力，进入不同的<em>视觉现场</em>。
                                </h2>
                                <p className="section-lede">从商品主图到完整角色短片，都基于同一套资产与生产基础输出。</p>
                            </div>
                            <span className="section-num">Issue 01 / pp. 14–15</span>
                        </div>

                        <div className="app-grid">
                            <div className="app-card">
                                <span className="app-index">App. 01</span>
                                <div className="app-visual">
                                    <img src={publicPath("/landing/app-commerce.webp")} alt="电商主图示例" loading="lazy" />
                                </div>
                                <h3>电商主图</h3>
                                <p>商品、场景与卖点视觉</p>
                            </div>
                            <div className="app-card">
                                <span className="app-index">App. 02</span>
                                <div className="app-visual">
                                    <img src={publicPath("/landing/app-brand.webp")} alt="品牌内容示例" loading="lazy" />
                                </div>
                                <h3>品牌内容</h3>
                                <p>持续一致的品牌叙事</p>
                            </div>
                            <div className="app-card">
                                <span className="app-index">App. 03</span>
                                <div className="app-visual">
                                    <img src={publicPath("/landing/app-character.webp")} alt="虚拟角色示例" loading="lazy" />
                                </div>
                                <h3>虚拟角色</h3>
                                <p>身份稳定的角色资产</p>
                            </div>
                            <div className="app-card">
                                <span className="app-index">App. 04</span>
                                <div className="app-visual">
                                    <img src={publicPath("/landing/app-storyboard.webp")} alt="分镜表示例" loading="lazy" />
                                </div>
                                <h3>分镜表</h3>
                                <p>镜头节奏与构图规划</p>
                            </div>
                            <div className="app-card">
                                <span className="app-index">App. 05</span>
                                <div className="app-visual">
                                    <img src={publicPath("/landing/app-video.webp")} alt="图生视频示例" loading="lazy" />
                                </div>
                                <h3>图生视频</h3>
                                <p>关键帧驱动动态镜头</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Workflow */}
                <section id="workflow" className="section">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">One Continuous Loop</p>
                                <h2 className="section-title">
                                    一条链路，持续长出<em>下一次创作</em>。
                                </h2>
                                <p className="section-lede">每一步都能回到画布，每一次产出都能成为下一次生产的起点。</p>
                            </div>
                            <span className="section-num">Issue 01 / pp. 16</span>
                        </div>

                        <div className="workflow-line">
                            <div className="workflow-step">
                                <b>01</b>
                                <strong>剧本</strong>
                                <span>先明确叙事的意图</span>
                            </div>
                            <div className="workflow-step">
                                <b>02</b>
                                <strong>角色</strong>
                                <span>建立稳定的身份资产</span>
                            </div>
                            <div className="workflow-step">
                                <b>03</b>
                                <strong>场景</strong>
                                <span>统一世界与空间关系</span>
                            </div>
                            <div className="workflow-step">
                                <b>04</b>
                                <strong>分镜</strong>
                                <span>拆解镜头与节奏</span>
                            </div>
                            <div className="workflow-step">
                                <b>05</b>
                                <strong>关键帧</strong>
                                <span>锁定画面的关键判断</span>
                            </div>
                            <div className="workflow-step">
                                <b>06</b>
                                <strong>视频</strong>
                                <span>让静态画面开始运动</span>
                            </div>
                            <div className="workflow-step">
                                <b>07</b>
                                <strong>资产</strong>
                                <span>留下可复用的下一步</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Colophon / CTA */}
                <section id="cta" className="colophon">
                    <div className="container">
                        <p className="section-kicker">Build the Next Scene</p>
                        <h2>
                            把你的视觉生产，带进<em>同一块画布</em>。
                        </h2>
                        <p>SceneFlow 开放内测中。加入 80+ 真实创作者，从一张画布开始你的下一部作品。</p>
                        <div className="cover-actions" style={{ marginBottom: 0 }}>
                            <Link className="btn btn-primary" href="/canvas/canvas">
                                进入生产画布 ↗
                            </Link>
                            <Link className="btn btn-ghost" href="/pricing">
                                充值积分 ↗
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <div className="container footer-row">
                    <span className="footer-brand">
                        Scene<em>Flow</em>
                    </span>
                    <span className="footer-meta">
                        <span>AI Visual Production System</span>
                        <span>© 2026</span>
                    </span>
                </div>
            </footer>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        name: "SceneFlow",
                        alternateName: "SceneFlow AI 视觉生产系统",
                        url: "https://xingtudesign.com/canvas",
                        inLanguage: "zh-CN",
                        description: "面向电商视觉、品牌内容、虚拟角色、分镜和视频创作的 AI 视觉生产系统，把提示词、参考图、角色资产、镜头规划和生成结果沉淀进同一套可持续生产的视觉画布。",
                    }),
                }}
            />
        </div>
    );
}
