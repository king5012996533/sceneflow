"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Boxes,
    Film,
    GitBranch,
    ImagePlus,
    Library,
    PackageCheck,
    Sparkles,
    Video,
} from "lucide-react";

import { publicPath } from "@/lib/app-paths";

import { LoginModal } from "@/components/layout/login-modal";
import { useUserStore } from "@/stores/use-user-store";

const stack = ["Canvas", "Script", "Character", "Scene", "Storyboard", "Image", "Video", "Assets"];

const proofPoints = [
    ["01", "Spatial production", "Break a story, a product campaign, or a visual brief into connected cards on one canvas."],
    ["02", "Reusable visual memory", "Characters, three-view sheets, environments, references, keyframes, and outputs stay attached to the work."],
    ["03", "Production-ready structure", "Move from a rough idea to shot planning, asset requirements, and visual deliverables without losing context."],
];

const concepts = [
    {
        label: "SPACE",
        title: "One Visual Workspace",
        desc: "Put scripts, briefs, references, characters, scenes, images, video, audio, and prompts in the same production space.",
        icon: Boxes,
    },
    {
        label: "FLOW",
        title: "Connected Context",
        desc: "Use links to show dependencies between planning cards, asset cards, generation cards, and final output cards.",
        icon: GitBranch,
    },
    {
        label: "ASSETS",
        title: "Reusable Assets",
        desc: "Keep character identity, environment style, brand elements, and reference images reusable across projects.",
        icon: PackageCheck,
    },
    {
        label: "OUTPUT",
        title: "Every Visual Output",
        desc: "Short drama, ads, ecommerce visuals, IP concepts, game art, keyframes, and image-to-video pipelines can share one base.",
        icon: Film,
    },
];

const entries = [
    { title: "Open Canvas", href: "/canvas", icon: Boxes },
    { title: "Image Studio", href: "/image", icon: ImagePlus },
    { title: "Video Studio", href: "/video", icon: Video },
    { title: "Asset Library", href: "/assets", icon: Library },
];

const caseImages = [
    {
        src: publicPath("/showcase/ai-production-studio.png"),
        title: "Production Studio",
        desc: "A connected visual board for directors, artists, and operators.",
    },
    {
        src: publicPath("/showcase/wuxia-character-board.png"),
        title: "Character Bible",
        desc: "Portrait, costume details, weapon references, and three-view consistency.",
    },
    {
        src: publicPath("/showcase/wuxia-keyframe-grid.png"),
        title: "Action Keyframes",
        desc: "Shot-scale variations for image generation and image-to-video planning.",
    },
    {
        src: publicPath("/showcase/story-production-wall.png"),
        title: "Production Memory",
        desc: "Storyboards, references, scenes, and visual decisions preserved together.",
    },
];

export default function IndexPage() {
    const router = useRouter();
    const user = useUserStore((s) => s.user);
    const [loginOpen, setLoginOpen] = useState(false);
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    const requireAuth = (href: string) => {
        if (user) {
            router.push(href);
        } else {
            setPendingHref(href);
            setLoginOpen(true);
        }
    };

    return (
        <main className="h-full overflow-y-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_42%,#eef4ff_100%)] text-[#172033]">
            <LoginModal
                open={loginOpen}
                onClose={() => setLoginOpen(false)}
                onSuccess={() => { if (pendingHref) { router.push(pendingHref); setPendingHref(null); } }}
            />
            <section className="relative overflow-hidden border-b border-[#ded3c4] px-6 pb-16 pt-12">
                <CanvasGrid />
                <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(79,93,255,.18),transparent_58%)]" />
                <div className="absolute -left-28 top-36 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(24,168,137,.16),transparent_68%)] blur-2xl" />
                <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(201,109,240,.12),transparent_68%)] blur-2xl" />
                <div className="relative z-10 mx-auto max-w-7xl">
                    <div className="mx-auto max-w-5xl text-center">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm text-[#746b7a] shadow-[0_10px_30px_rgba(57,48,34,0.08)] backdrop-blur">
                            <Sparkles className="size-4 text-[#18a889]" />
                            Spatial workspace for visual production
                        </div>
                        <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-tight text-[#111827] sm:text-7xl lg:text-[88px]">
                            SceneFlow turns ideas into visual systems.
                        </h1>
                        <p className="mx-auto mt-6 max-w-3xl text-balance text-lg leading-8 text-[#5f6678]">
                            Build a connected production canvas for scripts, characters, scenes, references, keyframes,
                            storyboard tables, image generation, and video generation.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <button
                                onClick={() => requireAuth("/canvas")}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#4f5dff] bg-[#4f5dff] px-4 text-sm font-medium text-white shadow-[0_12px_30px_rgba(79,93,255,.22)] transition hover:bg-[#3846e8]"
                            >
                                Open Canvas
                                <ArrowRight className="size-4" />
                            </button>
                            <button
                                onClick={() => requireAuth("/image")}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d9d0ff] bg-white/75 px-4 text-sm font-medium text-[#4f5dff] transition hover:bg-[#f4f1ff]"
                            >
                                Try Generation
                            </button>
                        </div>
                    </div>

                    <div className="mx-auto mt-9 flex max-w-4xl flex-wrap justify-center gap-2">
                        {stack.map((item) => (
                            <span key={item} className="rounded-lg border border-white/70 bg-white/70 px-3 py-1.5 text-xs text-[#746b7a] shadow-[0_8px_24px_rgba(57,48,34,0.05)] backdrop-blur">
                                {item}
                            </span>
                        ))}
                    </div>

                    <div className="mx-auto mt-10 max-w-[1220px]">
                        <ShowcaseImage
                            src={publicPath("/showcase/visual-workflow-canvas.png")}
                            alt="SceneFlow visual workflow canvas"
                            label="Live workflow canvas"
                            caption="A complete visual production board: structure, character design, three-view consistency, environment design, storyboard, and keyframes."
                            priority
                        />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl border-b border-[#ded3c4] px-6 py-16">
                <div className="mb-10 grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">PRODUCT PROOF</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Not another isolated generator.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-[#6d6472] lg:justify-self-end">
                        The canvas is the product. Every generated asset can keep its upstream reasoning, reference,
                        prompt, and downstream usage visible.
                    </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    {proofPoints.map(([index, title, desc]) => (
                        <div key={index} className="rounded-xl border border-white/70 bg-white/76 p-5 shadow-[0_22px_70px_rgba(57,48,34,0.08)] backdrop-blur">
                            <div className="mb-12 text-sm text-[#a49aaa]">{index}</div>
                            <h3 className="text-xl font-medium tracking-tight">{title}</h3>
                            <p className="mt-4 text-sm leading-6 text-[#6d6472]">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl border-b border-[#ded3c4] px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">DELIVERABLES</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            From messy creative intent to a production table.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-[#6d6472]">
                            Storyboards are not just pictures. SceneFlow can turn a fragment into shots with framing,
                            action, dialogue, camera movement, duration, and required reference assets.
                        </p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-2">
                            <Metric value="8" label="shots structured" />
                            <Metric value="15s" label="planned runtime" />
                            <Metric value="6" label="production fields" />
                            <Metric value="Assets" label="linked references" />
                        </div>
                    </div>
                    <ShowcaseImage
                        src={publicPath("/showcase/storyboard-table.png")}
                        alt="SceneFlow storyboard table output"
                        label="Storyboard output"
                        caption="Shot number, framing, visual description, character action, dialogue, camera movement, duration, and required assets in one board."
                    />
                </div>
            </section>

            <section className="mx-auto max-w-7xl border-b border-[#ded3c4] px-6 py-16">
                <div className="mb-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">VISUAL CASES</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Make the workflow feel concrete.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-[#6d6472] lg:justify-self-end">
                        SceneFlow is built for visual production, so the homepage should show production-grade outcomes:
                        boards, assets, keyframes, and story memory.
                    </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    {caseImages.map((item) => (
                        <CaseImage key={item.src} {...item} />
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl border-b border-[#ded3c4] px-6 py-16">
                <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">CORE CONCEPTS</div>
                        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Build a living workspace around visual assets.
                        </h2>
                    </div>
                    <button
                        onClick={() => requireAuth("/canvas")}
                        className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-[#d9d0ff] bg-white/65 px-3 text-sm text-[#4f5dff] transition hover:bg-[#f4f1ff]"
                    >
                        Open workspace
                        <ArrowRight className="size-4" />
                    </button>
                </div>
                <div className="grid gap-3 lg:grid-cols-4">
                    {concepts.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="rounded-xl border border-white/70 bg-white/76 p-5 shadow-[0_22px_70px_rgba(57,48,34,0.07)] backdrop-blur">
                                <div className="mb-10 flex items-center justify-between">
                                    <span className="rounded-md border border-[#ded3c4] bg-[#f7f3ea] px-2 py-1 text-[10px] font-medium tracking-[0.16em] text-[#8a7f91]">
                                        {item.label}
                                    </span>
                                    <span className="grid size-9 place-items-center rounded-lg border border-[#d9d0ff] bg-[#f4f1ff] text-[#4f5dff]">
                                        <Icon className="size-4.5" />
                                    </span>
                                </div>
                                <h3 className="text-lg font-medium tracking-tight">{item.title}</h3>
                                <p className="mt-4 text-sm leading-6 text-[#6d6472]">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[0.66fr_1.34fr] lg:items-start">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">START POINTS</div>
                        <h2 className="text-3xl font-semibold tracking-tight">Start from the surface you need.</h2>
                        <p className="mt-4 max-w-xl text-base leading-7 text-[#6d6472]">
                            SceneFlow can start from a canvas, a single image, a video shot, or an asset library.
                            The final work still returns to the same project space.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {entries.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.title}
                                    onClick={() => requireAuth(item.href)}
                                    className="group min-h-36 rounded-xl border border-white/70 bg-white/76 p-5 text-left shadow-[0_18px_54px_rgba(57,48,34,0.07)] backdrop-blur transition hover:border-[#cfc8ff] hover:bg-[#f8f6ff]"
                                >
                                    <div className="mb-8 flex size-9 items-center justify-center rounded-lg border border-[#d9d0ff] bg-[#f4f1ff] text-[#4f5dff]">
                                        <Icon className="size-4.5" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-base font-medium tracking-tight">{item.title}</h3>
                                        <ArrowRight className="size-4 shrink-0 text-[#a49aaa] transition group-hover:translate-x-0.5 group-hover:text-[#4f5dff]" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>
        </main>
    );
}

function CanvasGrid() {
    return (
        <div
            className="absolute inset-0 opacity-70"
            style={{
                backgroundImage:
                    "linear-gradient(rgba(79,93,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(24,168,137,.055) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                backgroundPosition: "center",
            }}
        />
    );
}

function ShowcaseImage({
    src,
    alt,
    label,
    caption,
    priority = false,
}: {
    src: string;
    alt: string;
    label: string;
    caption: string;
    priority?: boolean;
}) {
    return (
        <figure className="overflow-hidden rounded-2xl border border-white/80 bg-white/86 shadow-[0_1px_0_rgba(255,255,255,0.82)_inset,0_34px_100px_rgba(57,48,34,0.16)] backdrop-blur">
            <div className="flex h-11 items-center justify-between border-b border-[#ded3c4] bg-[#fffdf8]/82 px-4">
                <div className="flex items-center gap-2 text-sm text-[#746b7a]">
                    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="size-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3">{label}</span>
                </div>
                <span className="hidden rounded-lg bg-[#f4f1ff] px-2 py-1 text-xs text-[#4f5dff] sm:inline">SceneFlow</span>
            </div>
            <div className="bg-[#e9e7e2] ring-1 ring-inset ring-white/70">
                <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className="block h-auto w-full" />
            </div>
            <figcaption className="border-t border-[#ded3c4] bg-[#fffdf8]/74 px-4 py-3 text-sm leading-6 text-[#6d6472]">{caption}</figcaption>
        </figure>
    );
}

function Metric({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-xl border border-white/70 bg-white/76 p-4 shadow-[0_18px_54px_rgba(57,48,34,0.07)] backdrop-blur">
            <div className="text-2xl font-semibold tracking-tight text-[#172033]">{value}</div>
            <div className="mt-2 text-sm text-[#8a7f91]">{label}</div>
        </div>
    );
}

function CaseImage({ src, title, desc }: { src: string; title: string; desc: string }) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-white/72 bg-white/80 shadow-[0_26px_80px_rgba(57,48,34,0.10)] backdrop-blur">
            <div className="aspect-[16/9] overflow-hidden bg-[#f1ebe0]">
                <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            </div>
            <div className="border-t border-[#ded3c4] p-4">
                <h3 className="text-lg font-medium tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d6472]">{desc}</p>
            </div>
        </article>
    );
}
