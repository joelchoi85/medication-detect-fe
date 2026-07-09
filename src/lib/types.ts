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
  warning: string;
  precautions: string;
  interactions: string;
  sideEffects: string;
  storage: string;
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
