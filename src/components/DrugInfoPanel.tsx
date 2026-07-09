"use client";

import { useEffect, useState } from "react";
import { colorForClass } from "@/lib/colors";
import type { Detection, DrugInfo, DrugInfoResponse } from "@/lib/types";

interface DrugInfoPanelProps {
  detection: Detection;
  onClose: () => void;
}

type Status = "loading" | "success" | "error";

const FIELDS: Array<{ key: keyof DrugInfo; label: string }> = [
  { key: "efficacy", label: "효능" },
  { key: "usage", label: "용법" },
  { key: "administration", label: "투약방법/기간" },
  { key: "warning", label: "사용 전 주의사항" },
  { key: "precautions", label: "주의사항" },
  { key: "interactions", label: "상호작용" },
  { key: "sideEffects", label: "이상반응" },
  { key: "storage", label: "보관법" },
];

export function DrugInfoPanel({ detection, onClose }: DrugInfoPanelProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<DrugInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 부모(PillDetector)가 detection이 바뀔 때마다 key를 바꿔 이 컴포넌트를 새로 마운트하므로
  // useState 초기값이 곧 리셋 역할을 한다 — effect 안에서 동기적으로 재설정할 필요가 없다.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/drug-info?name=${encodeURIComponent(detection.class_name)}`)
      .then((res) => res.json() as Promise<DrugInfoResponse>)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setData(res.data);
          setStatus("success");
        } else {
          setErrorMessage(res.error);
          setStatus("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage("의약품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [detection.class_name]);

  const color = colorForClass(detection.class_id);

  return (
    <section
      aria-label={`${detection.class_name} 상세정보`}
      className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="min-w-0 truncate text-base font-semibold">{detection.class_name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="상세정보 닫기"
          className="shrink-0 rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/[.08]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div aria-live="polite">
        {status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-foreground/70">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            의약품 정보를 불러오는 중…
          </p>
        )}

        {status === "error" && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {errorMessage}
          </p>
        )}

        {status === "success" && data && (
          <div className="flex flex-col gap-4">
            {data.isPrescriptionOnly && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                전문의약품(처방약)입니다. 아래 정보는 참고용이며, 실제 복용 여부와 방법은 처방한 의사 또는 조제한 약사와 상담하세요.
              </p>
            )}
            {data.entpName && <p className="text-sm text-foreground/60">{data.entpName}</p>}
            {FIELDS.filter(({ key }) => data[key]).map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line break-words">
                  {data[key]}
                </p>
              </div>
            ))}
            <p className="text-xs text-foreground/40">
              {data.source === "nedrug"
                ? "출처: 식품의약품안전처 의약품안전나라 첨부문서 — 전문의약품 포함 전체 허가 품목."
                : "출처: 식품의약품안전처 의약품개요정보(e약은요) — 일반의약품만 제공됩니다."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
