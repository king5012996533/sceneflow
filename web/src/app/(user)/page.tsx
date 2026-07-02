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
        <main className="h-full overflow-y-auto bg-[#08090b] text-white">
            <LoginModal
                open={loginOpen}
                onClose={() => setLoginOpen(false)}
                onSuccess={() => { if (pendingHref) { router.push(pendingHref); setPendingHref(null); } }}
            />
            <section className="relative overflow-hidden border-b border-white/10 px-6 pb-16 pt-12">
                <CanvasGrid />
                <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(82,95,255,.24),transparent_58%)]" />
                <div className="relative z-10 mx-auto max-w-7xl">
                    <div className="mx-auto max-w-5xl text-center">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-3 py-1.5 text-sm text-white/68 backdrop-blur">
                            <Sparkles className="size-4 text-cyan-300" />
                            Spatial workspace for visual production
                        </div>
                        <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-tight sm:text-7xl lg:text-[88px]">
                            SceneFlow turns ideas into visual systems.
                        </h1>
                        <p className="mx-auto mt-6 max-w-3xl text-balance text-lg leading-8 text-white/58">
                            Build a connected production canvas for scripts, characters, scenes, references, keyframes,
                            storyboard tables, image generation, and video generation.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <button
                                onClick={() => requireAuth("/canvas")}
                                className="inline-flex h-11 items-center gap-2 rounded-md border border-white bg-white px-4 text-sm font-medium text-[#08090b] transition hover:bg-white/88"
                            >
                                Open Canvas
                                <ArrowRight className="size-4" />
                            </button>
                            <button
                                onClick={() => requireAuth("/image")}
                                className="inline-flex h-11 items-center gap-2 rounded-md border border-white/14 bg-white/[0.055] px-4 text-sm font-medium text-white/78 transition hover:bg-white/[0.09]"
                            >
                                Try Generation
                            </button>
                        </div>
                    </div>

                    <div className="mx-auto mt-9 flex max-w-4xl flex-wrap justify-center gap-2">
                        {stack.map((item) => (
                            <span key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/44">
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

            <section className="mx-auto max-w-7xl border-b border-white/10 px-6 py-16">
                <div className="mb-10 grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-white/32">PRODUCT PROOF</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Not another isolated generator.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-white/46 lg:justify-self-end">
                        The canvas is the product. Every generated asset can keep its upstream reasoning, reference,
                        prompt, and downstream usage visible.
                    </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    {proofPoints.map(([index, title, desc]) => (
                        <div key={index} className="rounded-md border border-white/10 bg-white/[0.028] p-5">
                            <div className="mb-12 text-sm text-white/26">{index}</div>
                            <h3 className="text-xl font-medium tracking-tight">{title}</h3>
                            <p className="mt-4 text-sm leading-6 text-white/44">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl border-b border-white/10 px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-white/32">DELIVERABLES</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            From messy creative intent to a production table.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-white/50">
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

            <section className="mx-auto max-w-7xl border-b border-white/10 px-6 py-16">
                <div className="mb-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-white/32">VISUAL CASES</div>
                        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Make the workflow feel concrete.
                        </h2>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-white/46 lg:justify-self-end">
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

            <section className="mx-auto max-w-7xl border-b border-white/10 px-6 py-16">
                <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-white/32">CORE CONCEPTS</div>
                        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                            Build a living workspace around visual assets.
                        </h2>
                    </div>
                    <button
                        onClick={() => requireAuth("/canvas")}
                        className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/14 px-3 text-sm text-white/58 transition hover:bg-white/[0.06] hover:text-white"
                    >
                        Open workspace
                        <ArrowRight className="size-4" />
                    </button>
                </div>
                <div className="grid gap-3 lg:grid-cols-4">
                    {concepts.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.028] p-5">
                                <div className="mb-10 flex items-center justify-between">
                                    <span className="rounded border border-white/10 px-2 py-1 text-[10px] font-medium tracking-[0.16em] text-white/34">
                                        {item.label}
                                    </span>
                                    <span className="grid size-9 place-items-center rounded-md border border-white/10 bg-black/20 text-white/58">
                                        <Icon className="size-4.5" />
                                    </span>
                                </div>
                                <h3 className="text-lg font-medium tracking-tight">{item.title}</h3>
                                <p className="mt-4 text-sm leading-6 text-white/44">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[0.66fr_1.34fr] lg:items-start">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-white/32">START POINTS</div>
                        <h2 className="text-3xl font-semibold tracking-tight">Start from the surface you need.</h2>
                        <p className="mt-4 max-w-xl text-base leading-7 text-white/52">
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
                                    className="group min-h-36 rounded-md border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-white/22 hover:bg-white/[0.06]"
                                >
                                    <div className="mb-8 flex size-9 items-center justify-center rounded-md border border-white/10 bg-black/20 text-white/72">
                                        <Icon className="size-4.5" />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-base font-medium tracking-tight">{item.title}</h3>
                                        <ArrowRight className="size-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/80" />
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
            className="absolute inset-0 opacity-80"
            style={{
                backgroundImage:
                    "linear-gradient(rgba(255,255,255,.052) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.052) 1px, transparent 1px)",
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
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#101114] shadow-[0_34px_100px_rgba(0,0,0,.5)]">
            <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
                <div className="flex items-center gap-2 text-sm text-white/46">
                    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="size-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3">{label}</span>
                </div>
                <span className="hidden rounded bg-white/[0.06] px-2 py-1 text-xs text-white/36 sm:inline">SceneFlow</span>
            </div>
            <div className="bg-[#e9e7e2]">
                <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className="block h-auto w-full" />
            </div>
            <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-6 text-white/46">{caption}</figcaption>
        </figure>
    );
}

function Metric({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
            <div className="mt-2 text-sm text-white/38">{label}</div>
        </div>
    );
}

function CaseImage({ src, title, desc }: { src: string; title: string; desc: string }) {
    return (
        <article className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.028]">
            <div className="aspect-[16/9] overflow-hidden bg-[#101114]">
                <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            </div>
            <div className="border-t border-white/10 p-4">
                <h3 className="text-lg font-medium tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/44">{desc}</p>
            </div>
        </article>
    );
}
