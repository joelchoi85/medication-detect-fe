import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 공공데이터포털에서 발급받은 "일반 인증키(Decoding)"를 그대로 넣어야 한다.
// URL 인코딩된 키(Encoding)를 넣으면 URLSearchParams가 다시 인코딩해 이중 인코딩 오류가 난다.
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY ?? "";

const BASE_URL = "http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

interface DrbEasyDrugItem {
  entpName?: string;
  itemName?: string;
  itemSeq?: string;
  efcyQesitm?: string;
  useMethodQesitm?: string;
  atpnWarnQesitm?: string;
  atpnQesitm?: string;
  intrcQesitm?: string;
  seQesitm?: string;
  depositMethodQesitm?: string;
}

interface DrbEasyDrugResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: DrbEasyDrugItem[] | { item?: DrbEasyDrugItem | DrbEasyDrugItem[] } | "";
      totalCount?: number;
    };
  };
}

function normalizeItemsPayload(
  items: DrbEasyDrugItem[] | { item?: DrbEasyDrugItem | DrbEasyDrugItem[] } | "" | undefined,
): DrbEasyDrugItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === "object" && "item" in items) {
    const item = items.item;
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
  return [];
}

/**
 * itemName 또는 itemSeq(품목기준코드/이른바 "K코드")로 e약은요를 조회한다.
 * itemSeq가 주어지면 이름 매칭 문제 없이 정확히 조회 가능하다.
 */
async function queryDrugList(
  params: { itemName?: string; itemSeq?: string },
  numOfRows = 1,
): Promise<DrbEasyDrugItem[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  if (params.itemName) url.searchParams.set("itemName", params.itemName);
  if (params.itemSeq) url.searchParams.set("itemSeq", params.itemSeq);
  url.searchParams.set("type", "json");
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("pageNo", "1");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    // 의약품 개요정보는 자주 바뀌지 않으므로 하루 단위로 캐시해 호출량을 줄인다.
    next: { revalidate: 60 * 60 * 24 },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`data.go.kr HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let json: DrbEasyDrugResponse;
  try {
    json = JSON.parse(text);
  } catch {
    // 인증키 오류 등은 JSON이 아니라 XML/HTML로 내려오는 경우가 있다.
    throw new Error(`data.go.kr 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  const header = json.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`data.go.kr 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  return normalizeItemsPayload(json.response?.body?.items);
}

// 용량 단위 표기 차이(mg ↔ 밀리그람/밀리그램 등)를 흡수하기 위한 변형 목록.
// e약은요 itemName은 "500밀리그람"처럼 단위를 한글로 풀어쓰는 경우가 많아
// 모델이 뱉는 "500mg" 형태 그대로는 매칭되지 않는 일이 잦다.
const UNIT_MAP: Array<[RegExp, string]> = [
  [/mg/gi, "밀리그람"],
  // [/mg/gi, "밀리그램"],
  [/mcg|μg/gi, "마이크로그람"],
  // [/mcg|μg/gi, "마이크로그램"],
  // "mg"/"mcg"의 g까지 오매칭되지 않도록 앞에 영문/한글 글자가 없을 때만(단독 g) 치환.
  [/(?<![a-zA-Z가-힣])g\b/gi, "그람"],
];

function buildUnitVariants(name: string): string[] {
  const variants = new Set<string>();
  for (const [pattern, replacement] of UNIT_MAP) {
    if (pattern.test(name)) {
      const replaced = name.replace(pattern, replacement);
      variants.add(replaced);
      variants.add(replaced.replace(/(\d)(밀리그람|밀리그램|마이크로그람|마이크로그램|그람)/, "$1 $2"));
    }
  }
  return [...variants];
}

// 괄호 설명/슬래시 포장단위 등을 제거해 재검색용 이름을 만든다.
function stripDecorations(name: string): string | null {
  const stripped = name
    .replace(/\(.*?\)/g, "")
    .replace(/\/.*$/, "")
    .trim();
  return stripped && stripped !== name ? stripped : null;
}

// 이름에서 용량 숫자를 뽑아낸다 (예: "타이레놀정500mg" -> "500").
function extractDoseNumber(name: string): string | null {
  const match = name.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

// 뒤쪽 용량+단위, 괄호를 잘라내 핵심 제품명만 남긴다 (prefix 검색용).
function extractBaseName(name: string): string | null {
  const stripped = name
    .replace(/\(.*?\)/g, "")
    .replace(/\/.*$/, "")
    .replace(/\d+(\.\d+)?\s*(mg|mcg|μg|g|ml|IU)\b.*$/i, "")
    .trim();
  return stripped.length >= 2 && stripped !== name ? stripped : null;
}

async function searchByName(rawName: string): Promise<DrbEasyDrugItem | null> {
  // 1) 원래 이름 그대로
  const exact = await queryDrugList({ itemName: rawName });
  if (exact[0]) return exact[0];

  // 2) 괄호/슬래시 제거
  const stripped = stripDecorations(rawName);
  if (stripped) {
    const strippedResult = await queryDrugList({ itemName: stripped });
    if (strippedResult[0]) return strippedResult[0];
  }

  // 3) 단위 표기 변형 (mg -> 밀리그람/밀리그램, 공백 유무 등)
  for (const variant of buildUnitVariants(stripped ?? rawName)) {
    const variantResult = await queryDrugList({ itemName: variant });
    if (variantResult[0]) return variantResult[0];
  }

  // 4) 핵심 제품명으로 prefix 검색 후, 용량 숫자가 일치하는 후보를 선택
  //    (단위 표기가 완전히 달라도 숫자만 맞으면 매칭 가능)
  const baseName = extractBaseName(stripped ?? rawName);
  const doseNumber = extractDoseNumber(rawName);
  if (baseName) {
    const candidates = await queryDrugList({ itemName: baseName }, 30);
    if (candidates.length > 0) {
      if (doseNumber) {
        const matched = candidates.find((c) => c.itemName?.includes(doseNumber));
        if (matched) return matched;
      } else if (candidates.length === 1) {
        return candidates[0];
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  if (!SERVICE_KEY) {
    return NextResponse.json(
      { success: false, error: "서버에 DATA_GO_KR_SERVICE_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const name = request.nextUrl.searchParams.get("name")?.trim();
  // 클래스별로 정확한 품목기준코드(K코드)를 알고 있다면 이 파라미터로 넘겨 이름 매칭을 완전히 우회할 수 있다.
  const itemSeq = request.nextUrl.searchParams.get("itemSeq")?.trim();

  if (!name && !itemSeq) {
    return NextResponse.json(
      { success: false, error: "name 또는 itemSeq 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    let item: DrbEasyDrugItem | null = null;

    if (itemSeq) {
      const result = await queryDrugList({ itemSeq });
      item = result[0] ?? null;
    }

    if (!item && name) {
      item = await searchByName(name);
    }

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error:
            "e약은요(일반의약품) 정보에서 찾을 수 없습니다. 전문의약품이거나, 등록되지 않았거나, 다른 상품명으로 등재된 품목일 수 있습니다.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        itemName: item.itemName || name || "",
        entpName: item.entpName ?? "",
        efficacy: item.efcyQesitm ?? "",
        usage: item.useMethodQesitm ?? "",
        warning: item.atpnWarnQesitm ?? "",
        precautions: item.atpnQesitm ?? "",
        interactions: item.intrcQesitm ?? "",
        sideEffects: item.seQesitm ?? "",
        storage: item.depositMethodQesitm ?? "",
      },
    });
  } catch (err) {
    console.error("[drug-info] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "의약품 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
