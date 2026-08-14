"use client";

// 件数の推移グラフ。
//
// 積み上げ棒（種別ごとの件数）＋ 折れ線（対応済み件数）を1枚に重ねる。
//
// グラフのライブラリは足していない。この1枚のために依存を増やすと、
// バンドルが重くなり、更新のたびに追従が要る。SVG で足りる。

import React, { useId, useState } from "react";
import { LEAD_KINDS, type LeadKind, type TrendPoint } from "@/lib/callforce";

/**
 * 種別の色。アクセント #9e8d70 を基調に、濃淡ではなく色相で分ける。
 * 濃淡だけだと、棒が細いときに隣と見分けられない。
 */
const KIND_COLOR: Record<LeadKind, string> = {
  受電デモ: "#9e8d70",
  架電デモ: "#5b7c8d",
  "広告・Web": "#c4a86a",
};

/** 対応済みの折れ線 */
const LINE_COLOR = "#d4645f";

export function TrendChart({ points }: { points: TrendPoint[] }) {
  // 同じページに複数置いても id が衝突しないようにする
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">まだデータがありません</p>;
  }

  // 目盛りは実データの最大値から決める。固定にすると件数が伸びたとき振り切れる
  const rawMax = Math.max(1, ...points.map((p) => p.total));
  const step = rawMax <= 5 ? 1 : rawMax <= 20 ? 5 : 10;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);

  // viewBox で描き、表示幅はCSSに任せる（横スクロールでも比率が崩れない）
  const W = 640;
  const H = 220;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const slot = plotW / points.length;
  const barW = Math.min(28, slot * 0.55);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const cx = (i: number) => padL + slot * i + slot / 2;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(p.responded).toFixed(1)}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-3">
      {/* 凡例。色だけ出しても何の色か分からないので必ず添える */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {LEAD_KINDS.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: KIND_COLOR[k] }} />
            {k}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: LINE_COLOR }} />
          対応済み
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full min-w-[36rem]"
          role="img"
          aria-label="件数の推移"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={padL} y={padT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* 横の目盛り線。数字だけだと高さの比較ができない */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-neutral-200 dark:text-neutral-700"
              />
              <text
                x={padL - 6}
                y={y(t) + 3}
                textAnchor="end"
                fontSize={9}
                fill="currentColor"
                className="tabular-nums text-neutral-400"
              >
                {t}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            // 土日は背景を薄く敷く。休みの日に件数が少ないのは当然なので、
            // 平日の落ち込みと混同させない
            if (!p.weekend) return null;
            return (
              <rect
                key={`we-${p.key}`}
                x={padL + slot * i}
                y={padT}
                width={slot}
                height={plotH}
                fill="currentColor"
                className="text-neutral-400/10"
              />
            );
          })}

          {/* 積み上げ棒 */}
          <g clipPath={`url(#${clipId})`}>
            {points.map((p, i) => {
              let acc = 0;
              return (
                <g key={p.key}>
                  {LEAD_KINDS.map((k) => {
                    const v = p.byKind[k];
                    if (v === 0) return null;
                    const top = y(acc + v);
                    const h = y(acc) - top;
                    acc += v;
                    return (
                      <rect
                        key={k}
                        x={cx(i) - barW / 2}
                        y={top}
                        width={barW}
                        height={h}
                        fill={KIND_COLOR[k]}
                        opacity={hover === null || hover === i ? 1 : 0.35}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* 対応済みの折れ線 */}
          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={1.8} strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={`d-${p.key}`} cx={cx(i)} cy={y(p.responded)} r={2.4} fill={LINE_COLOR} />
          ))}

          {/* X軸の文字。本数が多いと重なるので、多いときは1つおきに出す */}
          {points.map((p, i) => {
            const thin = points.length > 10 && i % 2 === 1;
            if (thin) return null;
            return (
              <text
                key={`x-${p.key}`}
                x={cx(i)}
                y={H - 12}
                textAnchor="middle"
                fontSize={8.5}
                fill="currentColor"
                className={p.weekend ? "text-neutral-300" : "text-neutral-500"}
              >
                {p.label}
              </text>
            );
          })}

          {/* 触れた列を明るくするための当たり判定。棒が細くても拾えるよう列全体に置く */}
          {points.map((p, i) => (
            <rect
              key={`h-${p.key}`}
              x={padL + slot * i}
              y={padT}
              width={slot}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {`${p.label}　計${p.total}件`}
                {LEAD_KINDS.filter((k) => p.byKind[k] > 0)
                  .map((k) => `\n${k} ${p.byKind[k]}`)
                  .join("")}
                {`\n対応済み ${p.responded}`}
              </title>
            </rect>
          ))}
        </svg>
      </div>
    </div>
  );
}
