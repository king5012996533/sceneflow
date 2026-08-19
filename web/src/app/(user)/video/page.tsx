import { redirect } from "next/navigation";

// 视频创作台已合并进对话式创作台 /studio
export default function VideoPage() {
    redirect("/studio");
}
