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
 *
 * 3色は目で選ばず、OKLab 上の距離を測って決めてある。見た目で
 * 「十分違う」と思った色でも、P型・D型色覚では重なって1本の棒に見えることがある。
 * 実際、最初に置いた砂色（#c4a86a）はアクセントとの距離が足りず、
 * 白地でのコントラストも 2.2:1 しか無かったので差し替えた。
 * いまの3色は隣り合わせでも全組み合わせでも距離が足り、
 * 白地・暗い地のどちらでも 3:1 以上ある。
 */
const KIND_COLOR: Record<LeadKind, string> = {
  受電デモ: "#9e8d70",
  架電デモ: "#1d6f80",
  "広告・Web": "#94532f",
};

/**
 * 対応済みの折れ線は、棒の3色とは別枠の「地の文字色」で引く。
 *
 * 4色目を足すと棒のどれかと必ず近くなる（赤系にしたところ、D型色覚で
 * アクセントとほぼ同じ色になった）。線は棒の上を横切る一本なので、
 * 色で仲間分けするより、明暗で浮かせたほうが追える。
 */
const LINE_CLASS = "text-neutral-800 dark:text-neutral-100";

/** 段の境目に空ける隙間（viewBox の単位＝ほぼ1px） */
const SEG_GAP = 2;

/**
 * 上端だけ角を丸めた棒を返す。
 * 下端は軸に接している辺なので角のままにする。両端を丸めると、
 * 棒が短い日に軸から浮いて見えて「0件なのか1件なのか」が読めなくなる。
 */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  if (rr === 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return (
    `M${x},${y + h}L${x},${y + rr}Q${x},${y} ${x + rr},${y}` +
    `L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h}Z`
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  // 同じページに複数置いても id が衝突しないようにする
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">まだデータがありません</p>;
  }

  // 目盛りは実データの最大値から決める。固定にすると件数が伸びたとき振り切れる。
  // 刻みは「線が5本を超えない中でいちばん細かいもの」を選ぶ。
  // 粗い刻みに寄せると、1日数件の時期に棒が軸の下半分しか使わず、
  // 日ごとの差がほとんど見えなくなる（6件を 0〜10 の軸で描くと潰れる）
  const rawMax = Math.max(1, ...points.map((p) => p.total));
  const step = [1, 2, 5, 10, 20, 50, 100].find((s) => rawMax / s <= 5) ?? 200;
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
          <span className="h-0.5 w-4 rounded-full bg-neutral-800 dark:bg-neutral-100" />
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
              // 0件の種別は段そのものを作らない。段として置くと、
              // 境目の隙間だけが残って「何か乗っている」ように見える
              const segs: { kind: LeadKind; from: number; to: number }[] = [];
              let acc = 0;
              for (const k of LEAD_KINDS) {
                const v = p.byKind[k];
                if (v > 0) segs.push({ kind: k, from: acc, to: acc + v });
                acc += v;
              }
              return (
                <g key={p.key} opacity={hover === null || hover === i ? 1 : 0.35}>
                  {segs.map((s, si) => {
                    const bottom = y(s.from);
                    const isTop = si === segs.length - 1;
                    // 段の境目は線で仕切らず、地の色を2px覗かせる。
                    // 線を1本足すより軽く、色が近くても段の数を目で追える
                    const drawTop = y(s.to) + (isTop ? 0 : SEG_GAP);
                    const h = Math.max(1.5, bottom - drawTop);
                    return (
                      <path
                        key={s.kind}
                        d={barPath(cx(i) - barW / 2, bottom - h, barW, h, isTop ? 3 : 0)}
                        fill={KIND_COLOR[s.kind]}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* 対応済みの折れ線 */}
          <g className={LINE_CLASS}>
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* 点は0件の日には打たない。0が続く期間は軸の上に点が並ぶだけになり、
                実際に対応した日がどこなのかがかえって見えなくなる */}
            {points.map((p, i) =>
              p.responded > 0 ? (
                <circle
                  key={`d-${p.key}`}
                  cx={cx(i)}
                  cy={y(p.responded)}
                  r={3}
                  fill="currentColor"
                  // 棒に重なる位置に来るので、地の色で縁取って輪郭を残す
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
              ) : null
            )}
          </g>

          {/* X軸の文字。本数が多いと重なるので、多いときは1つおきに出す。
              間引きは右端（＝最新）から数える。左から数えると本数が偶数のときに
              今日のラベルが消え、いちばん見たい日付が読めなくなる */}
          {points.map((p, i) => {
            const thin = points.length > 10 && (points.length - 1 - i) % 2 === 1;
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
