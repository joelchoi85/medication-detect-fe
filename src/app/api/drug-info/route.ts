import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 공공데이터포털에서 발급받은 "일반 인증키(Decoding)"를 그대로 넣어야 한다.
// URL 인코딩된 키(Encoding)를 넣으면 URLSearchParams가 다시 인코딩해 이중 인코딩 오류가 난다.
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY ?? "";

const BASE_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

// e약은요(DrbEasyDrugInfoService)는 "일반의약품 중 공급실적이 있는 품목"만 담고 있어서,
// 전문의약품(처방약)은 아무리 이름을 잘 정규화해도 원천적으로 검색이 안 된다
// (예: "가바펜틴"으로 검색해도 0건 — 데이터셋 자체에 없음).
// 이 한계를 보완하기 위해 식약처의 "의약품 제품 허가정보" API를 폴백으로 쓴다.
// 이 API는 전문의약품을 포함한 모든 허가 품목을 커버하지만, 효능/용법/주의사항 같은
// 상세 텍스트는 제공하지 않고 품목명·제조사·전문/일반 구분 등 허가 메타데이터만 준다.
// 그래서 "상세정보를 대신 보여주는" 용도가 아니라, "이 약이 왜 안 나오는지"를
// 정확하게 설명해주는 용도로만 쓴다 — 전문의약품이면 그렇게 안내하고, 그마저 없으면
// 기존의 포괄적인 "찾을 수 없음" 메시지로 되돌아간다.
const PERMISSION_BASE_URL =
  "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07";

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

interface DrbEasyDrugEnvelope {
  header?: { resultCode?: string; resultMsg?: string };
  body?: {
    items?: DrbEasyDrugItem[] | { item?: DrbEasyDrugItem | DrbEasyDrugItem[] } | "";
    totalCount?: number;
  };
}

// data.go.kr는 "response" 루트로 한 번 더 감싸서 내려줄 때도 있고(문서 예시),
// 감싸지 않고 {header, body}를 바로 최상위로 내려줄 때도 있어(실측) 둘 다 지원한다.
interface DrbEasyDrugResponse extends DrbEasyDrugEnvelope {
  response?: DrbEasyDrugEnvelope;
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
interface DebugEntry {
  url: string;
  status: number;
  totalCount?: number;
  resolvedCount?: number;
  codeVersion?: string;
  snippet: string;
}

async function queryDrugList(
  params: { itemName?: string; itemSeq?: string },
  numOfRows = 1,
  debugLog?: DebugEntry[],
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

  if (debugLog) {
    debugLog.push({
      url: url.toString().replace(SERVICE_KEY, "***"),
      status: res.status,
      snippet: text.slice(0, 300),
    });
  }

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

  // "response"로 한 번 더 감싸져 있으면 그 안을, 아니면 최상위를 사용한다.
  const envelope: DrbEasyDrugEnvelope = json.response ?? json;

  const header = envelope.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`data.go.kr 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const resolved = normalizeItemsPayload(envelope.body?.items);

  if (debugLog && debugLog.length > 0) {
    debugLog[debugLog.length - 1].totalCount = envelope.body?.totalCount;
    debugLog[debugLog.length - 1].resolvedCount = resolved.length;
  }

  return resolved;
}

// "의약품 제품 허가정보" API의 응답 필드는 e약은요와 달리 UPPER_SNAKE_CASE다(실측 확인).
// CANCEL_DATE가 채워져 있으면 허가가 취소/취하된 품목이므로 걸러내야 한다.
interface DrugPermissionItem {
  ITEM_SEQ?: string;
  ITEM_NAME?: string;
  ENTP_NAME?: string;
  SPCLTY_PBLC?: string; // "전문의약품" | "일반의약품" 등
  CANCEL_DATE?: string | null;
}

interface DrugPermissionEnvelope {
  header?: { resultCode?: string; resultMsg?: string };
  body?: {
    items?: DrugPermissionItem[] | { item?: DrugPermissionItem | DrugPermissionItem[] } | "";
    totalCount?: number;
  };
}

interface DrugPermissionResponse extends DrugPermissionEnvelope {
  response?: DrugPermissionEnvelope;
}

async function queryDrugPermission(
  itemName: string,
  numOfRows = 10,
  debugLog?: DebugEntry[],
): Promise<DrugPermissionItem[]> {
  const url = new URL(PERMISSION_BASE_URL);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("item_name", itemName); // 이 API는 파라미터명이 snake_case다.
  url.searchParams.set("type", "json");
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("pageNo", "1");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 60 * 60 * 24 },
  });

  const text = await res.text();

  if (debugLog) {
    debugLog.push({
      url: url.toString().replace(SERVICE_KEY, "***"),
      status: res.status,
      snippet: text.slice(0, 300),
    });
  }

  // 허가정보 API는 상세정보를 못 찾았다고 해서 사용자에게 에러를 보여줄 정도는 아니므로,
  // 실패하면 조용히 빈 배열을 반환하고 기존 "찾을 수 없음" 흐름으로 되돌아간다.
  if (!res.ok) return [];

  let json: DrugPermissionResponse;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }

  const envelope: DrugPermissionEnvelope = json.response ?? json;
  if (envelope.header?.resultCode && envelope.header.resultCode !== "00") return [];

  const items = envelope.body?.items;
  if (!items) return [];
  const resolved = Array.isArray(items) ? items : items && "item" in items && items.item ? (Array.isArray(items.item) ? items.item : [items.item]) : [];

  if (debugLog && debugLog.length > 0) {
    debugLog[debugLog.length - 1].totalCount = envelope.body?.totalCount;
    debugLog[debugLog.length - 1].resolvedCount = resolved.length;
  }

  // 취소/취하된 허가는 "현재 유효한 등록 품목"이 아니므로 제외한다.
  return resolved.filter((item) => !item.CANCEL_DATE);
}

// e약은요에서 못 찾았을 때, 이 이름이 애초에 전문의약품이라 그런 건지 확인한다.
// rawName -> normalizeForSearch 결과 순으로 시도하고, 첫 매칭을 채택한다.
async function findPermissionRecord(
  rawName: string,
  debugLog?: DebugEntry[],
): Promise<DrugPermissionItem | null> {
  const candidates1 = await queryDrugPermission(rawName, 5, debugLog);
  if (candidates1[0]) return candidates1[0];

  const normalized = normalizeForSearch(rawName);
  if (normalized) {
    const candidates2 = await queryDrugPermission(normalized, 5, debugLog);
    if (candidates2[0]) return candidates2[0];
  }

  return null;
}

// e약은요 itemName에는 공백이 들어가지 않고("타이레놀정500밀리그람"), 단위도 "mg"가 아니라
// "밀리그람"처럼 한글로 풀어쓰는 경우가 많다. 검색 API가 부분일치(LIKE)를 지원하므로,
// 굳이 mg -> 밀리그람으로 정확히 번역하지 않고 단위 자체를 떼어내 숫자만 남기면
// "타이레놀정500" 같은 문자열로도 "타이레놀정500밀리그람(...)"과 부분일치된다.
function normalizeForSearch(name: string): string | null {
  const normalized = name
    .replace(/\(.*?\)/g, "") // 괄호 설명 제거
    .replace(/\/.*$/, "") // 슬래시 뒤 포장단위 제거
    .replace(/(\d)\s*(?:mg|mcg|μg|g|ml|IU)\b/gi, "$1") // 숫자 뒤 단위 제거 (숫자는 유지)
    .replace(/\s+/g, "") // 공백 전부 제거
    .trim();
  return normalized && normalized !== name ? normalized : null;
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

// 이름 끝에 붙는 흔한 제형(劑形) 표기. 앞쪽 제조사명을 잘라낸 "나머지" 문자열을 검색할 때
// 이 접미어까지 붙어 있으면 등재명과 어긋나는 경우가 많아(예: "게루삼엠정(건조수산화알루미늄겔)"에는
// "겔" 뒤에 "정"이 아니라 괄호가 온다) 함께 떼어보는 용도다.
// 주의: "겔"은 일부러 넣지 않았다 — "건조수산화알루미늄겔"처럼 성분명 자체의 일부인 경우가 많아서,
// 이걸 접미어로 취급해 잘라내면 오히려 검색어가 깨진다.
const DOSAGE_FORM_SUFFIXES = ["정", "캡슐", "시럽", "산", "과립"];

function stripDosageFormSuffix(name: string): string | null {
  for (const suffix of DOSAGE_FORM_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length + 1) {
      return name.slice(0, -suffix.length);
    }
  }
  return null;
}

async function searchByName(
  rawName: string,
  debugLog?: DebugEntry[],
): Promise<DrbEasyDrugItem | null> {
  // 1) 원래 이름 그대로
  const exact = await queryDrugList({ itemName: rawName }, 1, debugLog);
  if (exact[0]) return exact[0];

  // 2) 괄호/슬래시/공백/단위 제거 (예: "타이레놀정500mg(...)" -> "타이레놀정500")
  const normalized = normalizeForSearch(rawName);
  if (normalized) {
    const normalizedResult = await queryDrugList({ itemName: normalized }, 1, debugLog);
    if (normalizedResult[0]) return normalizedResult[0];
  }

  // 3) 핵심 제품명으로 prefix 검색 후, 용량 숫자가 일치하는 후보를 선택
  //    (상품명 뒤쪽 표기가 완전히 달라도 숫자만 맞으면 매칭 가능한 최후의 수단)
  const baseName = extractBaseName(rawName);
  const doseNumber = extractDoseNumber(rawName);
  if (baseName) {
    const candidates = await queryDrugList({ itemName: baseName }, 30, debugLog);
    if (candidates.length > 0) {
      if (doseNumber) {
        const matched = candidates.find((c) => c.itemName?.includes(doseNumber));
        if (matched) return matched;
      }
      // 용량 숫자가 등재명에 아예 없는 경우(예: "트루비타정"에는 "60mg" 표기가 없음)도 있으므로,
      // 숫자 매칭에 실패했더라도 prefix 후보가 단 하나뿐이면 그것을 채택한다.
      if (candidates.length === 1) {
        return candidates[0];
      }
    }
  }

  // 4) 제조사명이 이름 맨 앞에 붙어 있는 관용 표기 대응 (최후의 수단).
  //    예: 검출 클래스명 "삼남건조수산화알루미늄겔정"의 "삼남"은 제품명이 아니라
  //    제조사 "삼남제약(주)"의 약칭이고, 실제 e약은요 등재명은 완전히 다른
  //    "게루삼엠정(건조수산화알루미늄겔)"이다. 이런 경우 앞부분(제조사명)과 뒷부분(성분/제품명)을
  //    구분할 구조적 단서(공백, 괄호, 숫자 등)가 전혀 없어서 위 1~3번 방식으로는 못 찾는다.
  //
  //    이 API의 itemName 파라미터는 앞부분 일치(prefix)가 아니라 부분 문자열 검색
  //    (LIKE '%문자열%')이라는 게 실측으로 확인됐다 — "건조수산화알루미늄겔"이라는 중간 토막만
  //    넣어도 "게루삼엠정(건조수산화알루미늄겔)"이 걸린다. 이 성질을 이용해서, 앞에서 2~4글자를
  //    순서대로 잘라내며(한국 제약사명은 대개 2~4음절: 삼남/유한/대웅/한미/종근당 등) 나머지
  //    문자열로 재검색한다. 제형 접미어("정" 등)가 나머지 끝에 남아 있으면 등재명과 어긋날 수 있어
  //    있는 그대로, 그리고 제형 접미어를 뗀 형태 둘 다 시도한다.
  //
  //    후보가 여러 건 나오면, 방금 잘라낸 "앞부분"이 후보의 제조사명(entpName)에 포함되는지로
  //    검증한다 — "삼남"을 잘라냈는데 후보 제조사가 "삼남제약(주)"라면 그 후보를 채택하는 식.
  //    이 제조사명 교차검증이 실패하고 후보가 정확히 1건뿐일 때만 추가로 채택한다.
  //
  //    ⚠️ 이건 결정적 규칙이 아니라 확률적 휴리스틱이다. 몇 글자를 자르는 게 맞는지 알 방법이
  //    없어서 여러 길이를 무작정 시도하는 것이므로, 드물게 엉뚱한 약과 매칭될 가능성이 있다.
  //    그래서 항상 다른 모든 방법이 실패했을 때만 실행되는 최후의 수단으로 둔다.
  for (let cut = 2; cut <= 4 && cut < rawName.length - 1; cut++) {
    const manufacturerGuess = rawName.slice(0, cut);
    const rest = rawName.slice(cut).trim();
    if (rest.length < 2) break;

    const strippedRest = stripDosageFormSuffix(rest);
    const variants = strippedRest ? [rest, strippedRest] : [rest];

    for (const variant of variants) {
      const candidates = await queryDrugList({ itemName: variant }, 30, debugLog);
      if (candidates.length === 0) continue;

      const byManufacturer = candidates.find(
        (c) => c.entpName && c.entpName.includes(manufacturerGuess),
      );
      if (byManufacturer) return byManufacturer;

      if (candidates.length === 1) return candidates[0];
    }
  }

  return null;
}

// 의약품안전나라(nedrug.mfds.go.kr, 식약처 공식 사이트)의 첨부문서 조회 기능.
// e약은요(DrbEasyDrugInfoService)는 "일반의약품 중 공급실적 있는 품목"만 담고 있어서
// 전문의약품은 원천적으로 상세 텍스트가 없다. 반면 의약품안전나라는 전문의약품을 포함한
// 모든 허가 품목의 실제 허가사항(첨부문서) 원문을 제공한다 — robots.txt에 별도 제한이 없고
// (health.kr과 달리 AI봇 차단 조항도 없음) 식약처가 직접 운영하는 정부 공개 데이터라서
// health.kr 같은 저작권/이용약관 문제가 없다.
//
// 품목 상세 페이지 자체(/pbp/CCBBB01/getItemDetail)는 2MB 넘는 풀페이지라 파싱하기 무겁지만,
// 그 페이지의 "HTML다운로드" 버튼이 가리키는 /pbp/cmn/html/drb/{itemSeq}/{docType} 엔드포인트는
// 해당 섹션 하나만 담은 수백 바이트짜리 가벼운 HTML 조각을 순수 서버사이드 fetch로 바로 내려준다
// (JS 렌더링이 필요한 SPA가 아니라 서버에서 완성된 HTML을 주는 방식임을 실측으로 확인했다).
// docType: EE=효능효과, UD=용법용량(마지막 소섹션이 "투약의 방법 및 기간"), NB=사용상의주의사항.
//
// 문서 원본을 그대로 보여주면 첨부문서 특성상 TMI가 된다 — 특히 NB는 경고·금기·신중투여 같은
// 실사용자에게 필요한 내용 외에, 임상시험 이상반응 빈도표(수백 개 숫자 표), 상호작용 임상약동학
// 수치, 임상검사치 영향, 전임상(동물실험) 발암성·기형발생 자료 등 일반 사용자에게는 과한 내용이
// 13개 소섹션에 걸쳐 61KB 넘게 들어있다(가바펜틴 기준 실측). 그래서:
//  1) 각 문서는 `<p class="title">N. 소제목</p>`으로 소섹션이 구분되므로, 이 마커로 잘라서
//     소제목별로 다룬다(splitDocSections).
//  2) NB는 "효능/용법/투약방법/주의사항"이라는 사용자가 원하는 4분류에 실제로 필요한 소섹션만
//     골라서(경고·금기·신중투여·일반적주의·임부수유부·소아·고령자·보관) 남기고, 순수 임상/통계/
//     전임상 자료(이상반응 빈도표, 상호작용 약동학, 임상검사치, 과량투여, 전임상자료)는 제외한다.
//  3) UD는 마지막 소섹션인 "투약의 방법 및 기간"을 별도 필드(administration)로 분리해서
//     "용법(연령별/체중별 등 용량)"과 "투약방법/기간"을 나눠 보여준다.
//  4) 그래도 표(<table>)가 남아있는 소섹션(예: 신기능장애 환자 용량조정표)은 통째로 지우지 않고
//     행 단위로 "셀1 | 셀2" 형태의 읽을 수 있는 텍스트로 변환한다(tableToPlainText) — 표를 무작정
//     삭제하면 "체중별/신기능별 용량조정" 같은 정작 필요한 정보까지 같이 사라지기 때문이다.
const NEDRUG_DOC_BASE_URL = "https://nedrug.mfds.go.kr/pbp/cmn/html/drb";

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

// 표 안의 셀 텍스트만 뽑아낸다 (줄바꿈 없이 한 줄로).
function stripTagsInline(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// <table>을 삭제하는 대신 "셀1 | 셀2 | ..." 줄 단위 텍스트로 변환한다.
function tableToPlainText(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
      const cells = [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) =>
        stripTagsInline(cellMatch[1]),
      );
      return cells.filter(Boolean).join(" | ");
    });
    return "\n" + rows.filter(Boolean).join("\n") + "\n";
  });
}

function htmlToPlainText(html: string): string {
  return decodeEntities(
    tableToPlainText(html)
      .replace(/<(p|div|li)[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDocBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  body = body.replace(/<h1[^>]*>.*?<\/h1>/gi, ""); // 문서 제목("효능효과" 등)은 프론트에서 라벨로 이미 보여줌
  return body;
}

interface DocSection {
  title: string;
  bodyHtml: string;
}

// `<p class="title">N. 제목</p>`을 기준으로 문서를 소섹션 배열로 쪼갠다.
function splitDocSections(bodyHtml: string): DocSection[] {
  const parts = bodyHtml.split(/<p class="title"[^>]*>([\s\S]*?)<\/p>/i);
  const sections: DocSection[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: stripTagsInline(parts[i]), bodyHtml: parts[i + 1] ?? "" });
  }
  return sections;
}

async function fetchNedrugDocHtml(itemSeq: string, docType: "EE" | "UD" | "NB"): Promise<string | null> {
  try {
    const res = await fetch(`${NEDRUG_DOC_BASE_URL}/${encodeURIComponent(itemSeq)}/${docType}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PillDetectWeb/1.0)" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// 사용상의주의사항(NB)에서 실사용자에게 필요한 소섹션만 골라낸다.
// 제외되는 것: 이상반응(임상시험 빈도표), 상호작용(약동학 수치), 임상검사치에의 영향,
// 과량투여시의 처치, 기타(전임상 동물실험 자료) — 전부 전문의료인용 상세 데이터라서
// "간단히 보기"라는 목적에는 맞지 않는다.
const NB_KEEP_TITLE_PATTERNS = [
  /경고/,
  /투여하지\s*말/,
  /신중히?\s*투여/,
  /일반적\s*주의/,
  /임부/,
  /수유부/,
  /소아/,
  /고령자/,
  /보관/,
];

// 용법용량(UD)의 마지막 소섹션은 거의 항상 "N. 투약의 방법 및 기간"이라, 이걸 따로 뽑아서
// "투약방법/기간"이라는 별도 필드로 분리한다.
const UD_ADMINISTRATION_TITLE_PATTERNS = [/투약.*방법/, /투여.*방법/, /복용\s*방법/];

async function fetchNedrugDetail(itemSeq: string): Promise<{
  efficacy: string;
  usage: string;
  administration: string;
  precautions: string;
}> {
  const [eeHtml, udHtml, nbHtml] = await Promise.all([
    fetchNedrugDocHtml(itemSeq, "EE"),
    fetchNedrugDocHtml(itemSeq, "UD"),
    fetchNedrugDocHtml(itemSeq, "NB"),
  ]);

  const efficacy = eeHtml ? htmlToPlainText(extractDocBody(eeHtml)) : "";

  let usage = "";
  let administration = "";
  if (udHtml) {
    const body = extractDocBody(udHtml);
    const sections = splitDocSections(body);
    const tailIndex = sections.findIndex((s) =>
      UD_ADMINISTRATION_TITLE_PATTERNS.some((re) => re.test(s.title)),
    );
    if (tailIndex >= 0) {
      administration = htmlToPlainText(sections[tailIndex].bodyHtml);
      usage = htmlToPlainText(
        sections
          .filter((_, i) => i !== tailIndex)
          .map((s) => `<p class="title">${s.title}</p>${s.bodyHtml}`)
          .join(""),
      );
    } else {
      // 소섹션 구조가 예상과 다르면(문서마다 100% 동일하지 않을 수 있음) 안전하게 전체를 보여준다.
      usage = htmlToPlainText(body);
    }
  }

  let precautions = "";
  if (nbHtml) {
    const body = extractDocBody(nbHtml);
    const sections = splitDocSections(body);
    const kept = sections.filter((s) => NB_KEEP_TITLE_PATTERNS.some((re) => re.test(s.title)));
    // 소섹션 구조를 못 찾았거나 필터링 결과가 비어있으면(예상 밖 포맷) 전체를 그대로 보여준다 —
    // 아예 안 보이는 것보다는 TMI라도 원문을 보여주는 게 안전하다.
    precautions =
      kept.length > 0
        ? kept.map((s) => `[${s.title}]\n${htmlToPlainText(s.bodyHtml)}`).join("\n\n")
        : htmlToPlainText(body);
  }

  return { efficacy, usage, administration, precautions };
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

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const debugLog: DebugEntry[] = [];

  try {
    let item: DrbEasyDrugItem | null = null;

    if (itemSeq) {
      const result = await queryDrugList({ itemSeq }, 1, debug ? debugLog : undefined);
      item = result[0] ?? null;
    }

    if (!item && name) {
      item = await searchByName(name, debug ? debugLog : undefined);
    }

    if (!item) {
      // e약은요에는 없지만, "의약품 제품 허가정보"(전문의약품 포함 전체 허가목록)에는
      // 있을 수 있다 — 있다면 의약품안전나라 첨부문서에서 실제 상세정보를 가져온다.
      const permission = name ? await findPermissionRecord(name, debug ? debugLog : undefined) : null;

      if (permission?.ITEM_SEQ) {
        const nedrug = await fetchNedrugDetail(permission.ITEM_SEQ);
        if (nedrug.efficacy || nedrug.usage || nedrug.precautions) {
          return NextResponse.json({
            success: true,
            data: {
              itemName: permission.ITEM_NAME ?? name ?? "",
              entpName: permission.ENTP_NAME ?? "",
              efficacy: nedrug.efficacy,
              usage: nedrug.usage,
              administration: nedrug.administration,
              warning: "",
              // NB(사용상의주의사항)에서 실사용자에게 필요한 소섹션(경고·금기·신중투여·일반적주의·
              // 임부수유부·소아·고령자·보관)만 골라 담았다 — 이상반응 통계표/상호작용 약동학 수치/
              // 전임상 자료 등은 의도적으로 제외했다(fetchNedrugDetail 주석 참고).
              precautions: nedrug.precautions,
              interactions: "",
              sideEffects: "",
              storage: "",
              source: "nedrug" as const,
              isPrescriptionOnly: permission.SPCLTY_PBLC === "전문의약품",
            },
          });
        }
      }

      const error = permission
        ? permission.SPCLTY_PBLC === "전문의약품"
          ? `이 약은 전문의약품(처방약)으로 등록되어 있습니다${
              permission.ITEM_NAME ? ` — ${permission.ITEM_NAME}` : ""
            }${
              permission.ENTP_NAME ? ` (${permission.ENTP_NAME})` : ""
            }. 상세 첨부문서를 찾지 못했습니다. 정확한 복용법과 주의사항은 처방받은 의사 또는 조제한 약사에게 확인해 주세요.`
          : `의약품으로 등록은 되어 있으나(${permission.ITEM_NAME ?? ""}) 상세정보를 찾지 못했습니다. 공급실적이 없는 품목이거나 최근 등재된 품목일 수 있습니다.`
        : "e약은요(일반의약품) 정보에서 찾을 수 없습니다. 전문의약품이거나, 등록되지 않았거나, 다른 상품명으로 등재된 품목일 수 있습니다.";

      return NextResponse.json(
        {
          success: false,
          error,
          ...(debug ? { debug: debugLog, serviceKeyLength: SERVICE_KEY.length } : {}),
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
        administration: "",
        warning: item.atpnWarnQesitm ?? "",
        precautions: item.atpnQesitm ?? "",
        interactions: item.intrcQesitm ?? "",
        sideEffects: item.seQesitm ?? "",
        storage: item.depositMethodQesitm ?? "",
        source: "e약은요" as const,
        isPrescriptionOnly: false,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[drug-info] failed:", message);
    return NextResponse.json(
      {
        success: false,
        error: "의약품 정보를 불러오는 중 오류가 발생했습니다.",
        ...(debug ? { debug: debugLog, exception: message, serviceKeyLength: SERVICE_KEY.length } : {}),
      },
      { status: 502 },
    );
  }
}
