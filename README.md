# 경구약제 검출 웹앱

이미지를 업로드하면 YOLO 기반 검출 API를 호출해 알약 종류/위치를 이미지 위에 시각화하는 Next.js(App Router) 앱입니다.

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속.

## 환경 변수

`.env.local` (이미 기본값으로 채워져 있음, 필요시 수정):

```
PREDICT_API_URL=https://joelchoi85-medication-detect.hf.space/predict
PREDICT_API_TOKEN=ULTRA-CAPSHYONG-3-TEAM-TOKEN-2026
```

검출 서버 주소/토큰은 `src/app/api/predict/route.ts`(서버 라우트)에서만 사용되며 클라이언트에는 노출되지 않습니다.

## 구조

- `src/app/api/predict/route.ts` — 업로드된 이미지를 검출 서버로 프록시. 파일 검증(타입/용량), 에러 처리 포함.
- `src/components/FileDropzone.tsx` — 이미지 업로드(드래그앤드롭 + 파일 선택).
- `src/components/PillDetector.tsx` — 업로드/요청/상태 관리 메인 컴포넌트.
- `src/components/DetectionOverlay.tsx` — 이미지 위에 SVG로 바운딩 박스를 그리는 시각화.
- `src/components/DetectionList.tsx` — 검출 결과 목록(클래스명 + 신뢰도).

## 백엔드 관련 참고

`/predict`는 기존에 YOLO raw 출력(후처리 없음)을 반환하며 `output.shape` 호출 버그로 항상 500을 반환하던 상태였습니다. 이번 작업에서 `medication_detect/app.py`에 바운딩 박스 디코딩, NMS, 클래스명 매핑을 추가해 다음 형식으로 응답하도록 수정했습니다. Hugging Face Space에 재배포가 필요합니다.

```json
{
  "success": true,
  "message": "알약 검출 완료",
  "original_size": [800, 600],
  "count": 2,
  "detections": [
    { "class_id": 11, "class_name": "타이레놀정500mg", "confidence": 0.87, "box": [120.5, 88.2, 240.1, 190.4] }
  ]
}
```
