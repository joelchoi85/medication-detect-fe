"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { colorForClass } from "@/lib/colors";
import type { Detection } from "@/lib/types";

interface DetectionOverlayProps {
  imageUrl: string;
  /** 원본 이미지 픽셀 크기 (박스 좌표계와 동일) */
  width: number;
  height: number;
  detections: Detection[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  /** 클릭/키보드 활성화 시 상세정보 열기 */
  onActivate?: (index: number) => void;
}

// 원본 이미지 픽셀 좌표계를 그대로 SVG viewBox로 사용하므로, 컨테이너가 리사이즈되어도
// JS로 크기를 재계산할 필요 없이 박스가 항상 이미지 위에 정확히 겹쳐진다.
export function DetectionOverlay({
  imageUrl,
  width,
  height,
  detections,
  activeIndex,
  onSelect,
  onActivate,
}: DetectionOverlayProps) {
  const textRefs = useRef<Array<SVGTextElement | null>>([]);
  const [labelWidths, setLabelWidths] = useState<number[]>([]);

  const fontSize = height / 32;
  const labelHeight = height / 22;
  const labelPaddingX = width / 200;

  // 라벨 배경이 실제 텍스트(한글/영문 혼용) 폭을 정확히 덮도록 렌더링 직후 실측한다.
  // useLayoutEffect라 페인트 전에 반영되어 잘못된 크기가 화면에 보이지 않는다.
  useLayoutEffect(() => {
    setLabelWidths(
      detections.map((_, index) => {
        const el = textRefs.current[index];
        if (!el) return 0;
        try {
          return el.getBBox().width;
        } catch {
          return 0;
        }
      }),
    );
  }, [detections]);

  // SVG는 z-index가 없고 그린 순서(DOM 순서)로 위아래가 결정된다. 박스가 서로 겹칠 때
  // 호버 중인 라벨이 다른 라벨에 가려지지 않도록, 활성화된 항목을 배열 맨 뒤로 옮겨서
  // 마지막에(=가장 위에) 그려지게 한다. 실제 detections 배열 순서/인덱스는 그대로 두고
  // "그리는 순서"만 바꾸는 것이므로 activeIndex 등 기존 로직은 손댈 필요 없다.
  const renderOrder = useMemo(() => {
    const order = detections.map((_, index) => index);
    if (activeIndex !== null && activeIndex >= 0 && activeIndex < order.length) {
      order.splice(order.indexOf(activeIndex), 1);
      order.push(activeIndex);
    }
    return order;
  }, [detections, activeIndex]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 업로드한 임의 크기의 blob 이미지라 next/image 최적화 대상이 아님 */}
      <img
        src={imageUrl}
        alt="업로드한 경구약제 이미지"
        width={width}
        height={height}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`검출된 알약 ${detections.length}개 표시`}
      >
        {renderOrder.map((index) => {
          const detection = detections[index];
          const [x1, y1, x2, y2] = detection.box;
          const isActive = activeIndex === index;
          const color = colorForClass(detection.class_id);
          const strokeWidth = Math.max(width, height) / 250;

          // 폭 실측 전에는 문자수 기반 추정치로 렌더링(첫 페인트 전에 useLayoutEffect가 보정함).
          const measuredWidth = labelWidths[index];
          const estimatedWidth = detection.class_name.length * fontSize * 0.95;
          const labelWidth = Math.min(
            width,
            (measuredWidth || estimatedWidth) + labelPaddingX * 2,
          );

          // 라벨이 이미지 좌/우 경계를 벗어나지 않도록 x를 클램프.
          const labelX = Math.max(0, Math.min(x1, width - labelWidth));
          // 박스 위쪽에 공간이 없으면(이미지 맨 위에 걸친 박스) 박스 안쪽 상단에 표시.
          const labelY = y1 - labelHeight >= 0 ? y1 - labelHeight : y1;

          return (
            <g
              key={`${detection.class_id}-${index}`}
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`${detection.class_name}, 신뢰도 ${(detection.confidence * 100).toFixed(1)}퍼센트, 상세정보 보기`}
              onMouseEnter={() => onSelect(index)}
              onMouseLeave={() => onSelect(null)}
              onFocus={() => onSelect(index)}
              onBlur={() => onSelect(null)}
              onClick={() => onActivate?.(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActivate?.(index);
                }
              }}
            >
              {/* 히트 영역용 투명 사각형. 테두리(stroke)만 있는 rect는 fill="none"이라
                  안쪽 면이 포인터 이벤트를 받지 못해서 테두리나 라벨을 정확히 짚어야만
                  선택됐다. fill을 투명색으로 채우고 pointerEvents를 "fill"로 지정하면
                  시각적으로는 그대로 투명하면서 박스 안쪽 전체가 클릭/호버 가능해진다. */}
              <rect
                x={x1}
                y={y1}
                width={Math.max(0, x2 - x1)}
                height={Math.max(0, y2 - y1)}
                fill="transparent"
                style={{ pointerEvents: "fill" }}
              />
              <rect
                x={x1}
                y={y1}
                width={Math.max(0, x2 - x1)}
                height={Math.max(0, y2 - y1)}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? strokeWidth * 1.8 : strokeWidth}
                rx={width / 200}
                style={{ transition: "stroke-width 120ms ease-out", pointerEvents: "none" }}
              />
              <rect
                x={labelX}
                y={labelY}
                width={labelWidth}
                height={labelHeight}
                fill={color}
                opacity={isActive ? 1 : 0.85}
              />
              <text
                ref={(el) => {
                  textRefs.current[index] = el;
                }}
                x={labelX + labelPaddingX}
                y={labelY + labelHeight / 2}
                dominantBaseline="central"
                fontSize={fontSize}
                fill="#ffffff"
                style={{ fontWeight: 600 }}
              >
                {detection.class_name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
