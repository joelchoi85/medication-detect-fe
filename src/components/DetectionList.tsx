"use client";

import { colorForClass } from "@/lib/colors";
import type { Detection } from "@/lib/types";

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  style: "percent",
  maximumFractionDigits: 1,
});

interface DetectionListProps {
  detections: Detection[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  onActivate: (index: number) => void;
}

export function DetectionList({ detections, activeIndex, onSelect, onActivate }: DetectionListProps) {
  if (detections.length === 0) {
    return (
      <p className="rounded-lg border border-black/10 bg-black/[.02] px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/10 dark:bg-white/[.03]">
        조건에 맞는 검출 결과가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {detections.map((detection, index) => {
        const isActive = activeIndex === index;
        const color = colorForClass(detection.class_id);
        return (
          <li key={`${detection.class_id}-${index}`}>
            <button
              type="button"
              onMouseEnter={() => onSelect(index)}
              onMouseLeave={() => onSelect(null)}
              onFocus={() => onSelect(index)}
              onBlur={() => onSelect(null)}
              onClick={() => onActivate(index)}
              aria-label={`${detection.class_name}, 신뢰도 ${percentFormatter.format(detection.confidence)}, 상세정보 보기`}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black ${
                isActive
                  ? "border-black/20 bg-black/[.04] dark:border-white/25 dark:bg-white/[.08]"
                  : "border-black/10 hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.04]"
              }`}
              style={{ ["--tw-ring-color" as string]: color }}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {detection.class_name}
              </span>
              <span className="shrink-0 text-sm text-foreground/60 [font-variant-numeric:tabular-nums]">
                {percentFormatter.format(detection.confidence)}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-foreground/30"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
