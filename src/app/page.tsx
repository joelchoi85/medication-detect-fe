import { PillDetector } from "@/components/PillDetector";

export default function Home() {
  return (
    <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-center text-5xl font-semibold tracking-tight text-balance">Health Eat 알약 검출 Proto type ver. 0.0.3</h1>
        <h3 className="text-center font-bold underline underline-offset-4 text-white/30">Part2 Mission - 3 TEAM</h3>
        <p className="text-sm text-foreground/60">
          알약 사진을 업로드하면 AI가 종류와 위치를 검출해 이미지 위에 표시합니다.
          <br/>
          현재는 테스트 데이터셋의 이미지까지만 원활하게 검출이 됩니다!
          <br/>
          동시접속자 수가 많아지면 시스템이 불안정할 수도 있습니다.
        </p>
      </header>
      <PillDetector />
      <footer className="mt-auto pt-8 border-t border-white/10 text-center text-xs text-foreground/40">
        <p>&copy; {new Date().getFullYear()} - 3 TEAM - ULTRA CAPSHYONG ITEM WITH 4 VALUES. All rights reserved.</p>
      </footer>
    </main>
  );
}
