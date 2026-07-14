import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "팀 소개 - ULTRA CAPSHYONG ITEM WITH 4 VALUES",
  description: "Part2 Mission 3팀 팀원 소개 및 프로젝트 회고.",
};

interface TeamMember {
  name: string;
  icon: string;
  retro: string;
  isLeader?: boolean;
}

// 순서: 이태민(팀장) -> 이형기 -> 장한빈 -> 최중열 -> 홍우석
const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "이태민",
    icon: "/itm.png",
    isLeader: true,
    retro:
      "부족한 팀장이었을텐데 다들 무언가를 제안하거나 지시하면 다들 잘 따라와 주셔서 너무 감사했습니다. 개인으로 모델을 만들던 것과 실제로 팀으로 모델을 만들고 하는 건 큰 차이가 있음을 느꼈고 그 간극을 팀원분들이 너무 잘해주셔서 너무 매끄럽게 진행되었던 것 같습니다. 그래서 프로젝트 하면서 팀원분들께 정말 많을 것을 배워갔습니다.",
  },
  {
    name: "이형기",
    icon: "/lhk.png",
    retro:
      "돌아보면 이 프로젝트에서 정말 남는 것은 특정 점수가 아니라 '믿을 수 있는 결론을 내는 과정' 그 자체였습니다. 그럴듯해 보이는 숫자를 그대로 받아들이지 않고, 통념을 데이터로 하나씩 검증하고 노이즈·누락·누수를 직접 걸러냈습니다. 그렇게 쌓은 신뢰 위에서 문제의 본질이 커버리지임을 실증했고, 마침내 0.9994에 이르렀습니다.\n\n무엇보다 여기서 만든 커버리지·자동 라벨정리·앙상블·검출→검색 설계는 대회에서 끝나지 않고 그대로 상용화(Phase 3~4)의 토대가 됩니다. 점수는 여정의 한 지점일 뿐, 진짜 자산은 그 과정에서 쌓인 규율과 재사용 가능한 도구들이라고 생각합니다.",
  },
  {
    name: "장한빈",
    icon: "/jhb.png",
    retro:
      "매일 아침 개개인의 작업에 대한 간단한 브리핑 시간을 가졌는데, 모든 팀원분들이 그 내용에 기반해서 겹치지 않도록 각자의 작업을 발전해 나가 주셔서 별도의 세세한 분업 없이도 프로젝트가 빠르게 완성된 것이 신기한 경험이었습니다. 그치만 지금 팀원분들이 너무 알아서 잘 해 주시는 능력 좋은 분들이라 오히려 다음 팀에서는 좀 더 팀원들과의 소통을 활발히 해야겠다는 생각도 하게 되었습니다.\n\n더불어 내가 어떤 부분을 찾고 일해야 팀원분들에게 도움이 될 수 있을까, 라는 것도 많이 생각해 보게 된 좋은 기회이고 경험이었습니다.",
  },
  {
    name: "최중열",
    icon: "/cjy.png",
    retro:
      "모두가 만렙이라 따라가기 힘들었지만, 얻어타는 기분으로 쾌적하게 과제를 진행했습니다? 학습이 좀 더 어려운 과제였다면 팀원들에게서 더 많은 부분을 배울 수 있었을 것 같습니다?",
  },
  {
    name: "홍우석",
    icon: "/hws.png",
    retro:
      "익숙하지 않은 객체 탐지 프로젝트였지만, 팀원분들께서 데이터 분석과 모델 학습, 제출 과정 등 다방면으로 도와주시고 이끌어주신 덕분에 2주 동안 이론과는 다른 정말 많은 것을 배울 수 있었습니다. 뛰어난 팀원분들과 함께한 이번 3팀에서의 경험은 감사하고 좋은 시간이었습니다.",
  },
];

export default function TeamPage() {
  return (
    <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <Link
          href="/"
          className="text-sm text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          ← 메인으로 돌아가기
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          ULTRA CAPSHYONG ITEM WITH 4 VALUES
        </h1>
        <p className="text-sm text-foreground/60">Part2 Mission · 3팀</p>
        {/* <Link
          href="/script"
          className="text-sm text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          발표 대본 보기 →
        </Link> */}
      </header>

      <section
        aria-label="팀원 소개"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2"
      >
        {TEAM_MEMBERS.map((member) => (
          <article
            key={member.name}
            className="flex flex-col gap-4 rounded-lg border border-black/10 p-5 dark:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Image
                  src={member.icon}
                  alt={`${member.name} 아이콘`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border border-black/10 object-cover dark:border-white/10"
                />
                {member.isLeader ? (
                  <span
                    aria-label="팀장"
                    title="팀장"
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg leading-none"
                  >
                    👑
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 text-sm leading-none"
                  >
                    ❤️
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold">{member.name}</h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {member.retro}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
