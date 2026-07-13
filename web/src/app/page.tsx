import Link from "next/link";

import { publicPath } from "@/lib/app-paths";

const metrics = [
    ["80+", "真实创作者参与内测"],
    ["ONE CANVAS", "从灵感到成片的统一画布"],
    ["ASSET MEMORY", "角色、场景与流程持续沉淀"],
];

const flow = ["剧本", "角色", "场景", "分镜", "关键帧", "视频", "资产"];

export default function Home() {
    return (
        <main className="sf-landing">
            <header className="sf-landing-header">
                <a className="sf-logo" href="#top">
                    <span>S</span>
                    SceneFlow
                </a>
                <nav aria-label="首页导航">
                    <a href="#canvas">生产系统</a>
                    <a href="#assets">资产沉淀</a>
                    <a href="#range">视觉作品</a>
                    <a href="#process">工作流</a>
                </nav>
                <Link className="sf-header-link" href="/canvas">
                    进入画布
                </Link>
            </header>

            <section className="sf-hero" id="top">
                <p className="sf-kicker">THE VISUAL PRODUCTION SYSTEM</p>
                <h1>
                    把创意，变成一种
                    <br />
                    <em>可持续的生产能力。</em>
                </h1>
                <p className="sf-hero-note">
                    SceneFlow 面向电商视觉、品牌内容、虚拟角色、分镜和视频创作。它不是再给你一次生成结果，而是把提示词、参考图、角色资产、镜头规划和生成结果沉淀进同一套视觉生产系统。
                </p>
                <div className="sf-hero-actions" aria-label="快速入口">
                    <Link href="/canvas">进入生产画布 <span>↗</span></Link>
                    <Link href="/pricing">申请开通权益 <span>↗</span></Link>
                </div>
                <div className="sf-metrics" aria-label="SceneFlow 关键指标">
                    {metrics.map(([value, label]) => (
                        <article key={value}>
                            <strong>{value}</strong>
                            <span>{label}</span>
                        </article>
                    ))}
                </div>
                <div className="sf-scroll">SCROLL TO ENTER THE SYSTEM</div>
            </section>

            <section className="sf-evidence" id="canvas">
                <div className="sf-section-head">
                    <p>01 / PRODUCT EVIDENCE</p>
                    <h2>
                        不是一次出图，
                        <br />
                        而是一条能被复用的视觉生产线。
                    </h2>
                </div>
                <div className="sf-canvas-frame">
                    <div className="sf-canvas-bar">
                        <span className="sf-mini-logo">
                            <b>S</b> PROJECT / SWORD AWAKENING
                        </span>
                        <span className="sf-online">
                            <i /> production online
                        </span>
                        <span>SHOT 08 / 16</span>
                    </div>
                    <div className="sf-canvas-body">
                        <aside>
                            <p>AI DIRECTOR</p>
                            <div className="sf-message">角色、世界观、画面规则和镜头顺序被写入同一张画布。</div>
                            <div className="sf-prompt">
                                <small>当前镜头</small>
                                <p>雨后的青竹林。镜头从剑身水痕推向角色侧脸，衣袂被风带起。</p>
                            </div>
                            <dl>
                                <div>
                                    <dt>IDENTITY</dt>
                                    <dd>LOCKED</dd>
                                </div>
                                <div>
                                    <dt>SHOT FLOW</dt>
                                    <dd>08 / 16</dd>
                                </div>
                            </dl>
                        </aside>
                        <div className="sf-visual-canvas">
                            <div className="sf-tool-row">
                                <span>画布 · 角色 · 分镜 · 队列</span>
                                <small>16:9 / 35mm</small>
                            </div>
                            <div className="sf-film-frame">
                                <img src={publicPath("/hero-frame.png")} alt="SceneFlow 电影级视觉画面" />
                                <div className="sf-lock">
                                    IDENTITY LOCK <b>98.7%</b>
                                </div>
                                <div className="sf-caption">
                                    <b>08</b>
                                    <span>雨停后的第一次觉醒</span>
                                    <small>slow push-in / 4s</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="sf-assets" id="assets">
                <p className="sf-section-number">02 / VIRTUAL ASSET LIBRARY</p>
                <div className="sf-asset-image">
                    <img src={publicPath("/character-asset.png")} alt="SceneFlow 虚拟角色资产" />
                    <span>ACTOR ID / A017</span>
                </div>
                <div className="sf-asset-copy">
                    <h2>
                        模型会更新。
                        <br />
                        真正留下来的，
                        <br />
                        <em>是你的角色、流程与作品资产。</em>
                    </h2>
                    <p>
                        每一次创作都在积累下一次生产所需的上下文。角色身份、三视图、世界设定、镜头语言、分镜模板和项目经验，不再随着一次生成结束而消失。
                    </p>
                </div>
            </section>

            <section className="sf-visual-range" id="range">
                <div className="sf-range-intro">
                    <p>03 / ONE SYSTEM, MANY VISUAL BUSINESSES</p>
                    <h2>
                        视觉生产，
                        <br />
                        不止一种形态。
                    </h2>
                    <span>电商主图 / 品牌内容 / 虚拟角色 / 分镜表 / 图生视频</span>
                </div>
                <div className="sf-range-gallery">
                    <figure className="sf-range-large">
                        <img src={publicPath("/commerce-visual.png")} alt="SceneFlow 电商商业视觉作品" />
                        <figcaption>COMMERCIAL / PRODUCT</figcaption>
                    </figure>
                    <figure>
                        <img src={publicPath("/brand-visual.png")} alt="SceneFlow 品牌视觉作品" />
                        <figcaption>BRAND / CAMPAIGN</figcaption>
                    </figure>
                    <figure>
                        <img src={publicPath("/hero-frame.png")} alt="SceneFlow 电影分镜视觉作品" />
                        <figcaption>STORY / CINEMA</figcaption>
                    </figure>
                </div>
            </section>

            <section className="sf-process" id="process">
                <div className="sf-process-intro">
                    <p>04 / ONE CONTINUOUS FLOW</p>
                    <h2>用一条链路，接住完整创作。</h2>
                </div>
                <ol>
                    {flow.map((item, index) => (
                        <li key={item}>
                            <span>0{index + 1}</span>
                            <b>{item}</b>
                            <i>{index < flow.length - 1 ? "→" : "↗"}</i>
                        </li>
                    ))}
                </ol>
                <p className="sf-process-note">每一阶段继承上一阶段已经锁定的角色、世界观、参考图和视觉规则，减少重复返工，也降低新人上手成本。</p>
            </section>

            <section className="sf-cta" id="cta">
                <p>05 / ENTER THE SYSTEM</p>
                <h2>
                    下一部视觉作品，
                    <br />
                    从同一张画布开始。
                </h2>
                <div className="sf-cta-links">
                    <Link href="/canvas">进入画布 <span>→</span></Link>
                    <Link href="/canvas">配置 API <span>→</span></Link>
                    <Link href="/pricing">申请开通权益 <span>→</span></Link>
                </div>
                <footer>
                    <b>SceneFlow</b>
                    <span>AI VISUAL PRODUCTION SYSTEM</span>
                    <small>© 2026</small>
                </footer>
            </section>
        </main>
    );
}
