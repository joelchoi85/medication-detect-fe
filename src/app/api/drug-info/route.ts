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

async function fetchDrugInfo(itemName: string): Promise<DrbEasyDrugItem | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("itemName", itemName);
  url.searchParams.set("type", "json");
  url.searchParams.set("numOfRows", "1");
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

  const items = json.response?.body?.items;
  if (!items) return null;

  if (Array.isArray(items)) return items[0] ?? null;
  if (typeof items === "object" && "item" in items) {
    const item = items.item;
    return Array.isArray(item) ? (item[0] ?? null) : (item ?? null);
  }
  return null;
}

// "타이레놀정500mg(수출명:...)" 같은 괄호 설명/포장단위를 제거해 재검색용 이름을 만든다.
function simplifyName(name: string): string | null {
  const stripped = name
    .replace(/\(.*?\)/g, "")
    .replace(/\/.*$/, "")
    .trim();
  return stripped && stripped !== name ? stripped : null;
}

export async function GET(request: NextRequest) {
  if (!SERVICE_KEY) {
    return NextResponse.json(
      { success: false, error: "서버에 DATA_GO_KR_SERVICE_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "name 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    let item = await fetchDrugInfo(name);
    if (!item) {
      const simplified = simplifyName(name);
      if (simplified) item = await fetchDrugInfo(simplified);
    }

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error:
            "e약은요(일반의약품) 정보에서 찾을 수 없습니다. 전문의약품이거나 등록되지 않은 품목일 수 있습니다.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        itemName: item.itemName || name,
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
