export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  /** [x1, y1, x2, y2] in the original uploaded image's pixel coordinates */
  box: [number, number, number, number];
}

export interface PredictSuccessResponse {
  success: true;
  message: string;
  original_size: [number, number];
  detections: Detection[];
  count: number;
}

export interface PredictErrorResponse {
  success: false;
  error: string;
}

export type PredictResponse = PredictSuccessResponse | PredictErrorResponse;

export interface DrugInfo {
  itemName: string;
  entpName: string;
  efficacy: string;
  usage: string;
  /** 투약 방법/기간 (의약품안전나라 출처일 때만 채워짐) */
  administration: string;
  warning: string;
  precautions: string;
  interactions: string;
  sideEffects: string;
  storage: string;
  /** "e약은요"(일반의약품) 또는 "nedrug"(의약품안전나라 첨부문서, 전문의약품 포함) */
  source: "e약은요" | "nedrug";
  /** true면 전문의약품 — 의료진 상담이 필요하다는 안내를 프론트에서 강조해야 한다 */
  isPrescriptionOnly: boolean;
}

export interface DrugInfoSuccessResponse {
  success: true;
  data: DrugInfo;
}

export interface DrugInfoErrorResponse {
  success: false;
  error: string;
}

export type DrugInfoResponse = DrugInfoSuccessResponse | DrugInfoErrorResponse;
