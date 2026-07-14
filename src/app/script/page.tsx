import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "발표 대본 - ULTRA CAPSHYONG ITEM WITH 4 VALUES",
  description: "알약 객체탐지 AI 프로젝트 통합 보고 발표 대본 — 카탈로그 특화에서 일반화까지.",
};

interface Slide {
  num: string;
  title: string;
  body: string;
}

interface Part {
  id: number;
  title: string;
  presenter: string;
  slideRange: string;
  targetTime: string;
  color: string;
  slides: Slide[];
}

const PARTS: Part[] = [
  {
    id: 1,
    title: "개요 & 시작",
    presenter: "본인",
    slideRange: "슬라이드 1–4",
    targetTime: "목표 2:30–3:00",
    color: "#2CA893",
    slides: [
      {
        num: "01",
        title: "표지",
        body: "안녕하세요, 프로젝트 1-3팀 **ULTRA CAPSHYONG ITEM WITH 4 VALUES**입니다. 저희는 알약 객체탐지 AI 프로젝트를 진행했고, 오늘은 그 여정을 \"카탈로그 특화에서 일반화까지\"라는 제목으로 통합 보고드리겠습니다. 발표는 이태민, 홍우석, 이형기, 장한빈, 최중열 다섯 명이 파트를 나눠 진행합니다. [팀원 간단히 소개]",
      },
      {
        num: "02",
        title: "문제 정의 & 목표",
        body: '저희가 풀고자 한 질문은 하나였습니다 — **"복용 중인 알약을 사진 한 장으로 인식할 수 있을까?"** 고령자나 만성질환자는 복용하는 약 종류가 많아 비슷한 약을 구분하기 어렵습니다. 그래서 모바일로 촬영 → 알약 위치 검출 → 종류 자동 인식, 이 세 단계를 목표로 잡았습니다. 이미지 한 장에 최대 4개 알약을 검출하고 클래스를 예측하는 것이 핵심 과제였고, **1단계 목표였던 mAP 0.90을 최종적으로 0.984까지 달성**했습니다.',
      },
      {
        num: "03",
        title: "초기 데이터 진단",
        body: "시작 시점의 데이터 상황은 만만치 않았습니다. **Train은 232장인데 Test는 842장으로 3.6배가 더 많았고**, 클래스 불균형도 심해서 가장 많은 클래스는 153개, 가장 적은 클래스는 3개 — 편차가 50배가 넘었습니다. 다만 저희는 이 저데이터 상황을 기획 단계에서 미리 인지하고, 전이학습·증강·외부데이터 활용을 처음부터 필수 전략으로 잡고 출발했습니다.",
      },
      {
        num: "04",
        title: "초기 모델 벤치마킹",
        body: '먼저 동일한 조건에서 6개 아키텍처를 정량 비교했습니다. 같은 fold, 같은 하니스, 100장 규모 서브셋에 20 epoch으로 통제했고, 그 결과 **RT-DETR-l이 0.737로 가장 높았습니다.** 참고로 Faster R-CNN이 MPS 환경에서 mAP 0.0이 나왔는데, 이걸 단순 버그로 보지 않고 "학습 발산"으로 진단해 warmup을 적용하니 정상 복구됐습니다. [다음 발표자에게 넘김]',
      },
    ],
  },
  {
    id: 2,
    title: "합성데이터 & 그림자 합성",
    presenter: "팀원A",
    slideRange: "슬라이드 5–8",
    targetTime: "목표 2:30–3:00",
    color: "#F2896F",
    slides: [
      {
        num: "05",
        title: "증강·합성 전략 개요",
        body: "데이터가 부족하니 어떻게 채울지가 관건이었습니다. 저희는 네 갈래로 접근했습니다. **① Copy-Paste 증강, ② SAM 기반 조명·그림자 합성, ③ AI Hub 데이터 통합, ④ Diffusion/GAN 검토**입니다. 이 중 ①·②·③은 적극 활용했고, Diffusion/GAN은 검토 결과 실제 노이즈 분포를 대체하지 못해 배제했습니다.",
      },
      {
        num: "06",
        title: "SAM 기반 조명·그림자 합성 파이프라인",
        body: "합성 이미지를 실제 촬영처럼 보이게 만드는 4단계입니다. SAM으로 알약을 누끼 분리하고, 배경을 따로 확보한 뒤, 배경의 색·밝기를 샘플링해 조명을 합성하고, 마지막으로 밝기 비대칭 ΔL로 광원 방향을 역산해 그림자를 렌더링합니다. [왼쪽 Before, 오른쪽 After 사진 비교] 그런데 **중요한 발견이 있었습니다 — 합성 이미지는 노이즈가 너무 적어서, 모델이 알약이 아니라 경계 픽셀 패턴을 학습하는 부작용**이 나타났습니다. 즉, 합성이 실제 노이즈 분포를 대체할 수는 없었습니다.",
      },
      {
        num: "07",
        title: "증강 효과 검증",
        body: "그럼 실제로 도움이 됐을까요? Kaggle 단독은 0.842였는데 AI Hub 증강을 더하니 0.991까지 올랐습니다. 다만 **정제한 원본 5,450장만으로도 0.9908이 나왔다**는 게 핵심입니다. 오히려 클래스 균형을 맞추려고 합성을 과하게 넣으면 Kaggle 점수가 떨어졌고, 합성 1,800장을 과다 투입했을 때는 내부 val 0.944가 실데이터에서 0.211로 폭락하는 domain gap이 나타났습니다.",
      },
      {
        num: "08",
        title: "소결론",
        body: '그래서 파트 2의 결론은 명확합니다. **"성능을 가장 크게 끌어올린 건 결국 원본 데이터의 양과 품질이었다."** 원본은 대체할 수 없고, 클래스 균형은 추출이 아니라 생성 단계에서 잡아야 하며, 이미 원본이 충분한 클래스에는 합성이 불필요하다 — 이 세 가지입니다. [다음 발표자에게 넘김]',
      },
    ],
  },
  {
    id: 3,
    title: "누수 체크 & 클래스 불균형 해소",
    presenter: "팀원B",
    slideRange: "슬라이드 9–14",
    targetTime: "목표 2:30–3:00",
    color: "#4C82D9",
    slides: [
      {
        num: "09",
        title: "문제 재정의: 커버리지",
        body: "여기서 저희는 관점을 바꿨습니다. **병목은 모델이 아니라 '커버리지'였습니다.** 같은 test 842장에서 GT 클래스가 71~79개로 늘어나자 기존 56클래스로는 점수가 급락했습니다. 그래서 AI Hub 116개 클래스를 전량 추출해 118클래스로 확장했더니, mAP가 0.74에서 0.99대까지 올라갔습니다.",
      },
      {
        num: "10",
        title: "Train 데이터 보강",
        body: '접근 방식도 "안 지우고 다 살린다"로 전환했습니다. 클래스를 118종으로 늘리고, AI Hub 116클래스 10,489장, 경구약제 5,800장을 추가로 확보한 뒤, 수작업 검토로 350장만 제외하고 **5,450장을 최종 채택**했습니다. 한동안 mAP 0.93이 한계라고 봤지만, 그건 좁은 데이터 슬라이스만 본 오판이었고 실제로는 0.98~0.99대까지 도달 가능했습니다.',
      },
      {
        num: "11",
        title: "데이터 누수 탐지",
        body: "성능이 갑자기 좋아 보이면 저희는 먼저 의심합니다. 두 종류의 누수를 잡았습니다. 하나는 **근접중복 누수** — AI Hub 조합2가 테스트셋과 근접중복이어서 유사도 분석으로 제거했고요. 다른 하나는 **real-copy 누수** — mAP 0.945라는 이례적 고득점을 의심해 source_file을 역추적하니 fold 사이 복사 누수가 확인됐습니다. YOLO11s에서만 유독 점수가 튀는 비단조 패턴이 결정적 단서였습니다.",
      },
      {
        num: "12",
        title: "라벨 자동정리 파이프라인",
        body: "라벨 정리도 자동화했습니다. **'모델 불일치'와 '기하 휴리스틱' 두 트랙의 신호를 가중합해 의심 라벨을 랭킹**합니다. 강한 모델이 자신 있게 GT와 다르게 보면 라벨을 의심하고, 동시에 모델 없이 박스 형태만으로도 명백한 오류를 규칙으로 잡습니다. [세부 플래그·가중치는 Q&A에서] 결과적으로 246장, 약 3%를 자동 검출했는데 이는 팀원 수작업 300장과 맞먹는 규모였고, 제거 실험에서 fold0가 0.9833에서 0.9860으로 개선됐습니다. 사람은 상위 랭킹만 수분간 검수하면 됩니다.",
      },
      {
        num: "13",
        title: "의심 라벨 검출 사례",
        body: "실제로 걸러낸 사례입니다. [왼쪽 검출 결과, 오른쪽 SAM2 컷아웃 감사 이미지] 박스로 표시된 것이 자동 플래그된 의심 라벨이고, 오른쪽은 누끼와 박스 정합을 검증한 화면입니다. AI Hub 원본 라벨 기준 **8,068장 중 246장, 3%가 의심 랭킹 상위로 자동 분류**됐고, 사람은 이 상위만 확인했습니다.",
      },
      {
        num: "14",
        title: "클래스 불균형 재조정 & 소결론",
        body: "다만 규모를 키워도 편차는 남았습니다. 118클래스, 8,700장 규모로 커졌는데도 희소 클래스 합성 보정의 개선 폭은 제한적이었습니다. **이건 카탈로그 내부 지표만으로는 한계가 있다는 신호였고, 그게 다음 단계로 넘어가는 계기**가 됐습니다. [다음 발표자에게 넘김]",
      },
    ],
  },
  {
    id: 4,
    title: "YOLO11 vs RT-DETR 발전",
    presenter: "팀원C",
    slideRange: "슬라이드 15–18",
    targetTime: "목표 2:30–3:00",
    color: "#8B7CD8",
    slides: [
      {
        num: "15",
        title: "정밀 비교 — YOLO11s vs RT-DETR L",
        body: "두 대표 모델을 정밀 비교했습니다. 내부 val에서는 YOLO11s가 0.986으로 앞섰지만, Kaggle에서는 RT-DETR L이 0.994로 더 높았습니다. 언뜻 과적합처럼 보이지만, **두 모델의 박스가 IoU 0.5 이상에서 99.17% 일치**했습니다. 즉 위치는 거의 같게 검출했고, 점수 차이는 RT-DETR이 376개를 더 잡아낸 recall 우위에 가깝습니다. 과적합 증거는 없었습니다.",
      },
      {
        num: "16",
        title: "RT-DETR 고도화 추이",
        body: "RT-DETR은 시작이 험난했습니다. **버그로 인한 0.0에서 출발**해서, backbone freeze와 Copy-Paste, 5-fold를 적용해 0.95, num_queries 조정으로 0.968, gradient clipping으로 0.982, 마지막으로 고급 증강과 80 epoch까지 밀어붙여 0.983에 도달했습니다. 발산을 잡고 단계적으로 끌어올린 과정입니다.",
      },
      {
        num: "17",
        title: "YOLO11n 고도화 & 앙상블 상한선",
        body: "정확도의 한계도 확인했습니다. YOLO11n 최종이 0.984, 단일 모델 최고는 YOLO11m으로 0.9988, **RT-DETR과 YOLO11을 WBF로 결합한 앙상블이 0.9994**였습니다. 다만 이 앙상블은 실제 서비스 모델이 아니라 상한선 검증용입니다. 파이프라인의 정확도 한계가 이미 충분히 높다는 걸 보여주는 근거로만 씁니다.",
      },
      {
        num: "18",
        title: "최종 모델 선정 — 왜 YOLO11n인가",
        body: "그래서 최종 선정 기준은 정확도가 아니라 '서비스 목적'이었습니다. **최종 채택은 YOLO11n입니다.** 정확도 0.984에 파라미터는 2.6M으로 가볍고, 모바일 실시간 추론에 유리합니다. RT-DETR·앙상블은 정확도 상한선을 검증하고 고도화 방향을 제시하는 역할로 뒀습니다. 정확도가 이미 서비스 요구 수준을 넘긴 시점부터는 속도가 더 중요한 지표니까요. [다음 발표자에게 넘김]",
      },
    ],
  },
  {
    id: 5,
    title: "오토라벨링",
    presenter: "팀원D",
    slideRange: "슬라이드 19–22",
    targetTime: "목표 3:00–3:30 (Q&A 유도)",
    color: "#E15A5A",
    slides: [
      {
        num: "19",
        title: "실도메인 검증 & 전환 계기",
        body: '여기서 저희가 마주한 현실입니다. **카탈로그 mAP는 0.985인데, 실사용 환경에서 Recall은 0.077에 불과했습니다.** [실제 촬영 사진] YOLO11s로도 0.107, 합성 최고 모델로도 0.181 수준이었습니다. R0 실사용 사진 78장으로 평가한 결과인데, 이 격차가 목표를 바꾸게 만들었습니다 — "카탈로그를 잘 찾는 모델"에서 "카탈로그 밖과 실제 환경에도 대응하는 범용 모델"로요.',
      },
      {
        num: "20",
        title: "오토라벨링 파이프라인",
        body: "그 답이 오토라벨링입니다. 카탈로그 밖 데이터를 사람 없이 라벨링합니다. **BRONZE(초벌) → SILVER(품질 게이팅) → GOLD(학습 투입 확정)** 3단계로, 식약처 MFDS 데이터 25,326건을 확보해 최종 30,135개 학습 박스를 만들었습니다. 통계 허들을 못 넘으면 사람 개입 없이 자동 배제되는 fail-closed 구조입니다. [세부 게이팅 조건은 Q&A에서 자세히 다루겠습니다]",
      },
      {
        num: "21",
        title: "신뢰도 기반 필터링",
        body: "핵심은 '자동 생성'이 아니라 '신뢰도 기반 선별'이라는 점입니다. **confidence 0.7 이상 75%는 자동 채택하고, 나머지 25%만 수동 검증**합니다. 수동 검증 후 최종 라벨 정확도는 99.5%이고, 데이터 확장 속도는 기존 대비 3배였습니다.",
      },
      {
        num: "22",
        title: "최종 성과",
        body: "그 결과 Phase 1과 비교해 실세계 대응력이 완전히 달라졌습니다. 총 클래스 168개, 총 이미지 14,000장 이상, **실세계 Recall은 0.08~0.18에서 0.72 이상으로, Precision은 0.85 이상**으로 올랐습니다. 카탈로그 성능은 유지하면서 실제 환경 미탐률을 크게 줄여, 현장 적용 가능성을 입증했습니다. [다음 발표자에게 넘김]",
      },
    ],
  },
  {
    id: 6,
    title: "마무리 & 시연",
    presenter: "본인",
    slideRange: "슬라이드 23–24 + 데모",
    targetTime: "목표 3:00–3:30",
    color: "#2CA893",
    slides: [
      {
        num: "23",
        title: "여정 요약",
        body: "정리하겠습니다. 저희 여정은 세 단계였습니다. **① 카탈로그 특화 — mAP 0.984, 앙상블 상한 0.9994 달성. ② 문제 재정의 — 병목이 커버리지임을 발견하고 56에서 118클래스로 확장. ③ 범용화 — 오토라벨링으로 실세계 Recall 0.72 이상 확보.** 특화에서 재정의를 거쳐 일반화에 이른 흐름입니다.",
      },
      {
        num: "24",
        title: "상용화 방향 — 검출에서 검색으로",
        body: "마지막으로 다음 단계입니다. 알약이 25,000종 이상이라, 소프트맥스 검출 헤드만으로는 무리입니다. **단기(A안)로는 단일 검출기로 수요 80%를 차지하는 상위 1,000~3,000종을 직접 분류**하고, **중장기(B안)로는 검출 후 임베딩을 뽑아 벡터 검색하는 구조**로 갑니다. 이러면 신약은 재학습 없이 '등록'만 하면 되고, 미상 알약도 정직하게 인정할 수 있습니다. 대회에서 만든 자동 라벨정리·앙상블·검출-검색 설계가 그대로 상용화의 토대가 됩니다.",
      },
      {
        num: "→",
        title: "라이브 시연",
        body: "그럼 실제로 보여드리겠습니다. [Vercel 배포 웹 인터페이스 열기] **사진 업로드 → 박스 검출 → nedrug·e약은요 정보 카드 연동**까지 이어집니다. [가능하면 카탈로그 안 알약과 카탈로그 밖(오토라벨링 학습) 알약을 나란히 보여주며 '범용화 성공'을 시각적으로 강조] 감사합니다. 질문 받겠습니다.",
      },
    ],
  },
];

const QNA_TEASER =
  "**Q&A 대비 티저 항목** — ① 라벨 자동정리 세부 플래그·가중치(no_pred_match 3.0, degenerate 3.0, class_mismatch 2.5 등) ② 오토라벨링 게이팅 조건(Wilson 하한 99.5%, 런타임 4/4 통과) ③ 앙상블 WBF 구성 ④ B안 임베딩 검색(ArcFace/contrastive, FAISS top-k) 상세.";

// **볼드** 와 [동작·전환 지시] 를 각각 강조/보조 텍스트 스타일로 렌더링한다.
// 원본 발표 대본의 내용과 문구는 그대로 두고 표현 방식만 바꾼다.
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("[") && part.endsWith("]")) {
          return (
            <span key={i} className="text-[13px] italic text-foreground/40">
              {" "}
              {part}{" "}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ScriptPage() {
  return (
    <main id="main-content" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link
          href="/"
          className="text-sm text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          ← 메인으로 돌아가기
        </Link>
      </div>

      <header className="flex flex-col gap-3 border-b border-black/10 pb-6 dark:border-white/10">
        <span className="text-xs font-bold tracking-[0.14em] text-[#F2896F]">
          ULTRA CAPSHYONG ITEM WITH 4 VALUES · 프로젝트 1-3팀
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
          발표 대본 — 카탈로그 특화에서 일반화까지
        </h1>
        <p className="text-sm text-foreground/60">
          알약 객체탐지 AI 프로젝트 통합 보고 · 총 24장 · 발표 20분 + Q&amp;A 5분 · 발표자 5명
        </p>
        <p className="text-sm leading-relaxed text-foreground/60">
          <FormattedText text="아래 대본은 슬라이드 1장당 실제로 말할 분량을 기준으로 작성했습니다. **[ ]** 안은 동작·전환 지시입니다. 파트별 목표 시간을 넘기지 않도록, 굵게 표시된 문장은 반드시 전달하고 나머지는 시간에 맞춰 조절하세요." />
        </p>
      </header>

      {/* 목차 */}
      <nav aria-label="파트 목차" className="flex flex-wrap gap-2">
        {PARTS.map((part) => (
          <a
            key={part.id}
            href={`#part-${part.id}`}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ borderColor: `${part.color}55`, color: part.color }}
          >
            PART {part.id} · {part.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-14">
        {PARTS.map((part) => (
          <section key={part.id} id={`part-${part.id}`} className="flex flex-col gap-5 scroll-mt-8">
            <div
              className="flex flex-col gap-1 rounded-r-xl border-l-4 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between"
              style={{ borderColor: part.color, backgroundColor: `${part.color}18` }}
            >
              <h2 className="text-lg font-extrabold">
                PART {part.id} · {part.title}
              </h2>
              <p className="text-xs font-medium text-foreground/60">
                발표: {part.presenter} · {part.slideRange} · {part.targetTime}
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {part.slides.map((slide) => (
                <article key={slide.num} className="flex gap-4">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${part.color}22`, color: part.color }}
                    aria-hidden="true"
                  >
                    {slide.num}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold" style={{ color: part.color }}>
                      {slide.title}
                    </h3>
                    <p className="text-[14.5px] leading-relaxed text-foreground/80">
                      <FormattedText text={slide.body} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-lg border-t-2 border-black/10 pt-4 text-xs leading-relaxed text-foreground/50 dark:border-white/10">
        <FormattedText text={QNA_TEASER} />
      </div>
    </main>
  );
}
