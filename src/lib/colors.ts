// 클래스별로 일관된 색상을 부여하기 위한 고정 팔레트 (박스 <-> 목록 항목 매칭용)
const PALETTE = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#14b8a6", // teal-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f43f5e", // rose-500
];

export function colorForClass(classId: number): string {
  return PALETTE[Math.abs(classId) % PALETTE.length];
}
