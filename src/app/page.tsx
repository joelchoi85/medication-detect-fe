import { PillDetector } from "@/components/PillDetector";

export default function Home() {
  return (
    <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">경구약제 이미지 검출</h1>
        <p className="text-sm text-foreground/60">
          알약 사진을 업로드하면 AI가 종류와 위치를 검출해 이미지 위에 표시합니다.
        </p>
      </header>
      <PillDetector />
    </main>
  );
}
