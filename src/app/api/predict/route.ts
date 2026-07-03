import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// HF Space가 절전 상태에서 깨어나는 데 시간이 걸릴 수 있어 여유 있게 설정.
// (Hobby 플랜은 설정 가능한 최대값이 낮을 수 있으니, 배포 후에도 타임아웃이 나면 플랜의 최대치로 낮춰야 함)
export const maxDuration = 60;

// 검출 서버 주소/토큰은 서버 환경변수로만 보관한다 (클라이언트 번들에 노출되지 않음).
// .env.local에 값이 없으면 아래 기본값(현재 배포된 HF Space)을 사용한다.
const PREDICT_API_URL =
  process.env.PREDICT_API_URL ?? "https://joelchoi85-medication-detect.hf.space/predict";
const PREDICT_API_TOKEN =
  process.env.PREDICT_API_TOKEN ?? "ULTRA-CAPSHYONG-3-TEAM-TOKEN-2026";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "이미지 파일이 필요합니다." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { success: false, error: "빈 파일은 업로드할 수 없습니다." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "파일 크기는 10MB 이하만 가능합니다." },
      { status: 413 },
    );
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: "JPG, PNG, WEBP 형식의 이미지만 지원합니다." },
      { status: 415 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(PREDICT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PREDICT_API_TOKEN}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: arrayBuffer,
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    // 원인(콜드스타트 타임아웃, DNS, TLS 등) 파악을 위해 서버 로그에 상세 기록.
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[predict] upstream fetch failed: ${name} - ${message}`, {
      url: PREDICT_API_URL,
    });
    const isTimeout = name === "TimeoutError" || name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "검출 서버가 응답하지 않습니다(절전 상태에서 깨어나는 중일 수 있습니다). 잠시 후 다시 시도해 주세요."
          : "검출 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(
      `[predict] upstream returned non-JSON (status ${upstream.status}): ${text.slice(0, 300)}`,
    );
    return NextResponse.json(
      { success: false, error: "검출 서버 응답을 해석할 수 없습니다." },
      { status: 502 },
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}
