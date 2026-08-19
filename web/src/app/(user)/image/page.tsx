import { redirect } from "next/navigation";

// 生图工作台已合并进对话式创作台 /studio
export default function ImagePage() {
    redirect("/studio");
}
