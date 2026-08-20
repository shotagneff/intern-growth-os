"use client";

// 反響リードの推移グラフ。共通の TrendChart（@/components/trend-chart）を
// 反響リード用の設定（種別=積み上げ＋対応済みの折れ線）で包むだけ。
import { LEAD_KINDS, type TrendPoint } from "@/lib/callforce";
import { TrendChart as GenericTrendChart } from "@/components/trend-chart";

// 種別の色。OKLab 上の距離で選んだ、色覚差でも見分けられる3色。
const KIND_COLOR: Record<string, string> = {
  受電デモ: "#9e8d70",
  架電デモ: "#1d6f80",
  "広告・Web": "#94532f",
};

export function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <GenericTrendChart
      points={points}
      series={LEAD_KINDS.map((k) => ({ key: k, color: KIND_COLOR[k] }))}
      mode="stack"
      showLine
      lineLabel="対応済み"
    />
  );
}
