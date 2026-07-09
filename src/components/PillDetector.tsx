"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DetectionList } from "@/components/DetectionList";
import { DetectionOverlay } from "@/components/DetectionOverlay";
import { DrugInfoPanel } from "@/components/DrugInfoPanel";
import { FileDropzone } from "@/components/FileDropzone";
import type { Detection, PredictResponse } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

interface ImagePreview {
  file: File;
  url: string;
  width: number;
  height: number;
}

const DEFAULT_THRESHOLD = 0.25;

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    img.src = url;
  });
}

export function PillDetector() {
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const requestIdRef = useRef(0);

  // 언마운트 시 블롭 URL 해제
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function handleFileSelected(file: File) {
    const currentRequestId = ++requestIdRef.current;

    if (preview) URL.revokeObjectURL(preview.url);
    const url = URL.createObjectURL(file);

    setDetections([]);
    setActiveIndex(null);
    setSelectedDetection(null);
    setErrorMessage(null);
    setStatus("loading");

    try {
      const dims = await loadImageDimensions(url);
      if (requestIdRef.current !== currentRequestId) return;
      setPreview({ file, url, width: dims.width, height: dims.height });
    } catch {
      if (requestIdRef.current !== currentRequestId) return;
      setStatus("error");
      setErrorMessage("이미지를 불러오지 못했습니다. 다른 파일을 시도해 주세요.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/predict", { method: "POST", body: formData });
      const data: PredictResponse = await response.json();
      if (requestIdRef.current !== currentRequestId) return;

      if (!response.ok || !data.success) {
        const message = !data.success ? data.error : "검출에 실패했습니다.";
        setStatus("error");
        setErrorMessage(message || "검출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setDetections(data.detections);
      setStatus("success");
    } catch {
      if (requestIdRef.current !== currentRequestId) return;
      setStatus("error");
      setErrorMessage("네트워크 오류로 검출 요청에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  function handleReset() {
    requestIdRef.current += 1;
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setStatus("idle");
    setDetections([]);
    setErrorMessage(null);
    setActiveIndex(null);
    setSelectedDetection(null);
    setThreshold(DEFAULT_THRESHOLD);
  }

  const filteredDetections = useMemo(
    () => detections.filter((d) => d.confidence >= threshold),
    [detections, threshold],
  );

  function handleActivate(index: number) {
    setSelectedDetection(filteredDetections[index] ?? null);
  }

  const isBusy = status === "loading";

  return (
    <div className="flex w-full flex-col gap-6">
      {!preview && <FileDropzone onFileSelected={handleFileSelected} disabled={isBusy} />}

      {preview && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <DetectionOverlay
              imageUrl={preview.url}
              width={preview.width}
              height={preview.height}
              detections={filteredDetections}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              onActivate={handleActivate}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-white/15 dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
              >
                다른 이미지 선택
              </button>
              <p className="truncate text-sm text-foreground/60">{preview.file.name}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div aria-live="polite" className="min-h-6 text-sm">
              {status === "loading" && (
                <p className="flex items-center gap-2 text-foreground/70">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                  알약을 검출하는 중…
                </p>
              )}
              {status === "error" && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-red-600 dark:text-red-400">
                  {errorMessage}
                </p>
              )}
              {status === "success" && (
                <p className="text-foreground/70">
                  총 <span className="[font-variant-numeric:tabular-nums]">{detections.length}</span>개 검출됨
                  {filteredDetections.length !== detections.length && (
                    <>
                      {" · "}
                      <span className="[font-variant-numeric:tabular-nums]">{filteredDetections.length}</span>개 표시 중
                    </>
                  )}
                  {filteredDetections.length > 0 && " · 항목을 클릭하면 상세정보를 볼 수 있어요"}
                </p>
              )}
            </div>

            {status === "success" && detections.length > 0 && (
              <div className="flex flex-col gap-2">
                <label htmlFor="threshold" className="flex items-center justify-between text-sm font-medium">
                  <span>최소 신뢰도</span>
                  <span className="[font-variant-numeric:tabular-nums]">
                    {new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 0 }).format(
                      threshold,
                    )}
                  </span>
                </label>
                <input
                  id="threshold"
                  type="range"
                  min={0.25}
                  max={0.9}
                  step={0.05}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            )}

            {status === "success" && (
              <DetectionList
                detections={filteredDetections}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
                onActivate={handleActivate}
              />
            )}

            {selectedDetection && (
              <DrugInfoPanel
                key={`${selectedDetection.class_id}-${selectedDetection.box.join(",")}`}
                detection={selectedDetection}
                onClose={() => setSelectedDetection(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
