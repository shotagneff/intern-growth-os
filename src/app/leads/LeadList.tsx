"use client";

// 反響リードの一覧。
//
// 「いま誰が対応できているか」が一番大事なので、
// 対応状況と担当を日時のすぐ隣に置いている。

import React, { useEffect, useMemo, useState } from "react";
import {
  ACQUISITION_CHANNELS,
  CHANNEL_REQUIRED_STATUS,
  FOLLOW_UP_STATUSES,
  LEAD_STATUSES,
  daysUntil,
  firstResponseMinutes,
  type Lead,
  type LeadStatus,
} from "@/lib/callforce";
import {
  CELL_INPUT,
  FILL,
  FilterChip,
  ToneSelect,
  ROW_HOVER,
  TD,
  TH,
  TONE,
  W,
} from "@/components/table-ui";

/** +818012345678 → 080-1234-5678 */
function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").replace(/^81/, "0");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// バッジの色。共通の決まり（TONE）から選ぶだけにする。
// ここで新しい色を作ると、アポ獲得管理と意味がずれる。
const STATUS_STYLE: Record<LeadStatus, string> = {
  未対応: TONE.red,
  留守番電話: TONE.violet,
  対応中: TONE.orange,
  アポ獲得: TONE.yellow,
  追客中: TONE.sky,
  失注: TONE.gray,
  対象外: TONE.gray,
};

const FILTERS = ["すべて", "未対応", "本日の追客", "期日超過", "受電デモ", "架電デモ", "広告・Web"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * 電話番号に紐づくメモ。
 *
 * 保存先は電話番号なので、同じ番号から次に着信したときも同じメモが出る。
 * 入力中は手元の値を優先し、離れたタイミングで保存する。
 * 1文字ごとに保存すると、打っている最中に再取得が走って書きかけが消える。
 */
function NoteCell({
  lead,
  onSave,
}: {
  lead: Lead;
  onSave: (phoneNumber: string, note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(lead.contactNote ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 自分が編集していないときだけ、取得し直した値に追従する
  useEffect(() => {
    if (!editing) setValue(lead.contactNote ?? "");
  }, [lead.contactNote, editing]);

  async function commit() {
    setEditing(false);
    if ((lead.contactNote ?? "") === value) return;
    setSaving(true);
    await onSave(lead.phoneNumber, value);
    setSaving(false);
  }

  return (
    <textarea
      value={value}
      rows={1}
      placeholder="メモ"
      onFocus={() => setEditing(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      disabled={saving}
      className={`w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed transition hover:border-neutral-200 focus:border-[#9e8d70] focus:bg-white focus:outline-none dark:hover:border-neutral-700 dark:focus:bg-neutral-900 ${
        saving ? "opacity-50" : ""
      }`}
    />
  );
}

/**
 * 次回連絡日。
 *
 * 「追客中」は期日が無いと沈む。日付を入れておけば、
 * 「本日の追客」「期日超過」で拾い上げられる。
 *
 * 追いかけが要る状態（留守番電話・追客中）のときだけ入力欄を出す。
 * 全行に出すと、失注や対象外にも日付が付いて一覧が濁る。
 */
function NextActionCell({
  lead,
  onPatch,
}: {
  lead: Lead;
  onPatch: (id: string, patch: { nextActionAt?: string | null }) => void;
}) {
  const needsFollowUp = FOLLOW_UP_STATUSES.includes(lead.status);
  const d = daysUntil(lead.nextActionAt);

  if (!needsFollowUp && !lead.nextActionAt) {
    return <span className="text-neutral-300">—</span>;
  }

  // 期日までの距離を言葉にする。日付だけだと今日との差を頭で計算させてしまう
  const label =
    d === null ? null : d < 0 ? `${-d}日超過` : d === 0 ? "本日" : `あと${d}日`;
  const tone =
    d === null
      ? "text-neutral-400"
      : d < 0
        ? "font-semibold text-red-600 dark:text-red-400"
        : d === 0
          ? "font-semibold text-orange-600 dark:text-orange-400"
          : "text-neutral-500";

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="date"
        value={lead.nextActionAt ?? ""}
        onChange={(e) => onPatch(lead.id, { nextActionAt: e.target.value || null })}
        className="rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-xs tabular-nums dark:border-neutral-700"
      />
      {label && <span className={`text-[10px] ${tone}`}>{label}</span>}
    </div>
  );
}

/**
 * 行の地色。
 *
 * 左端の帯だけだと、横に長い表では気づかない。行ごと薄く塗る。
 *
 * 5% では白地でほとんど見えなかったので 40% まで上げた。
 * 300 番台の色を 40% で敷くぶんには、上に載る黒文字のコントラストは
 * 落ちない（文字色には一切手を入れずに済んでいる）。
 * 暗い画面は地が黒く同じ数字だと沈むため、別の値を当てる。
 */
function rowTone(lead: Lead): string {
  if (lead.status === "未対応") return FILL.red;
  if (lead.status === "留守番電話") return FILL.violet;
  if (lead.status === "アポ獲得") return FILL.yellow;
  if (lead.status === "失注" || lead.status === "対象外") return FILL.gray;
  // 期日を過ぎた追客は、状況の色より優先して赤で出す
  const d = daysUntil(lead.nextActionAt);
  if (d !== null && d < 0) return FILL.red;
  return FILL.none;
}

export function LeadList({
  leads,
  responders,
  loading,
  savingId,
  onPatch,
  onSaveNote,
}: {
  leads: Lead[];
  responders: string[];
  loading: boolean;
  savingId: string | null;
  onPatch: (
    id: string,
    patch: {
      status?: LeadStatus;
      assignedTo?: string;
      nextActionAt?: string | null;
      acquisitionChannel?: string | null;
    }
  ) => void;
  onSaveNote: (phoneNumber: string, note: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>("すべて");
  // アポ獲得を選んだが流入経路が空だった行。ここだけ赤くして促す
  const [needChannel, setNeedChannel] = useState<string | null>(null);

  const shown = useMemo(() => {
    switch (filter) {
      case "未対応":
        return leads.filter((l) => l.status === "未対応");
      case "本日の追客":
        // 期日が今日以前のもの。過ぎた分もここに出さないと、
        // 「本日」だけ見て超過分を取りこぼす
        return leads.filter((l) => {
          const d = daysUntil(l.nextActionAt);
          return d !== null && d <= 0;
        });
      case "期日超過":
        return leads.filter((l) => {
          const d = daysUntil(l.nextActionAt);
          return d !== null && d < 0;
        });
      case "受電デモ":
        return leads.filter((l) => l.demoType === "受電デモ");
      case "架電デモ":
        return leads.filter((l) => l.demoType === "架電デモ" || (!l.demoType && l.source === "demo_call"));
      case "広告・Web":
        return leads.filter((l) => l.source === "ad_form" || l.source === "web_estimate");
      default:
        return leads;
    }
  }, [leads, filter]);

  return (
    <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <FilterChip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
        <span className="ml-auto text-sm tabular-nums text-neutral-400">{shown.length}件</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] text-sm">
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              <th className={TH}>日時</th>
              <th className={TH}>対応状況</th>
              <th className={TH}>流入経路</th>
              <th className={TH}>担当</th>
              <th className={TH}>次回連絡</th>
              <th className={TH}>電話番号</th>
              <th className={`${TH} min-w-[14rem]`}>メモ（番号ごとに引き継ぎ）</th>
              <th className={TH}>会社名</th>
              <th className={TH}>種別</th>
              <th className={TH}>流入元</th>
              <th className={`${TH} text-right`}>通話</th>
              <th className={`${TH} text-right`}>初動</th>
              <th className={TH}>録音</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-neutral-400">
                  読み込んでいます…
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-neutral-400">
                  該当するリードがありません
                </td>
              </tr>
            )}
            {shown.map((lead) => {
              const mins = firstResponseMinutes(lead);
              return (
                <tr
                  key={lead.id}
                  className={`border-t border-neutral-100 dark:border-neutral-800 ${ROW_HOVER} ${rowTone(
                    lead
                  )} ${savingId === lead.id ? "opacity-60" : ""}`}
                >
                  <td className={`${TD} ${W.date} tabular-nums text-neutral-600 dark:text-neutral-300`}>
                    {/* 手が要る行を左端の帯で示す。行数が増えても目に留まる */}
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`h-8 w-1 shrink-0 rounded-full ${
                          lead.status === "未対応"
                            ? "bg-red-400"
                            : lead.status === "留守番電話"
                              ? "bg-violet-400" // かけ直しが要る
                              : lead.status === "アポ獲得"
                                ? "bg-yellow-400"
                                : "bg-transparent"
                        }`}
                      />
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </td>
                  <td className={`${TD} ${W.phase}`}>
                    <ToneSelect
                      value={lead.status}
                      options={LEAD_STATUSES}
                      tone={STATUS_STYLE[lead.status]}
                      onChange={(v) => {
                        const next = v as LeadStatus;
                        // アポ獲得にするには流入経路が要る。
                        // サーバーでも弾いているが、押した直後に理由が分かるほうが直せる。
                        if (next === CHANNEL_REQUIRED_STATUS && !lead.acquisitionChannel) {
                          setNeedChannel(lead.id);
                          return;
                        }
                        setNeedChannel(null);
                        onPatch(lead.id, { status: next });
                      }}
                    />
                  </td>
                  <td className={`${TD} ${W.channel}`}>
                    <select
                      value={lead.acquisitionChannel ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setNeedChannel(null);
                        // 流入経路を入れた直後にアポ獲得へ進めるようにする。
                        // 2回操作させると、片方を忘れて元の状態に戻る
                        onPatch(lead.id, {
                          acquisitionChannel: v,
                          ...(needChannel === lead.id && v ? { status: CHANNEL_REQUIRED_STATUS } : {}),
                        });
                      }}
                      className={`${CELL_INPUT} cursor-pointer ${
                        needChannel === lead.id ? "border-red-400 bg-red-100 dark:bg-red-500/20" : ""
                      }`}
                    >
                      <option value="">—</option>
                      {ACQUISITION_CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {needChannel === lead.id && (
                      <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                        アポ獲得には流入経路が必要です
                      </p>
                    )}
                  </td>
                  <td className={`${TD} ${W.owner}`}>
                    <select
                      value={lead.assignedTo}
                      onChange={(e) => onPatch(lead.id, { assignedTo: e.target.value })}
                      className={`${CELL_INPUT} cursor-pointer`}
                    >
                      {[lead.assignedTo, ...responders.filter((r) => r !== lead.assignedTo)].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={TD}>
                    <NextActionCell lead={lead} onPatch={onPatch} />
                  </td>
                  <td className={`${TD} ${W.phone} font-medium tabular-nums`}>
                    <a href={`tel:${lead.phoneNumber}`} className="hover:underline">
                      {formatPhone(lead.phoneNumber)}
                    </a>
                    {lead.callerType && <span className="ml-2 text-xs text-neutral-400">{lead.callerType}</span>}
                    {/* 2回目以降は、引き継いだメモを読む価値がある相手 */}
                    {lead.callCount > 1 && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {lead.callCount}回目
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <NoteCell lead={lead} onSave={onSaveNote} />
                  </td>
                  <td className={`${TD} max-w-[12rem] truncate`}>{lead.companyName ?? "—"}</td>
                  <td className={`${TD} text-neutral-500`}>{lead.demoType ?? "—"}</td>
                  <td className={`${TD} max-w-[10rem] truncate text-neutral-500`}>{lead.inflow ?? "—"}</td>
                  <td className={`${TD} text-right tabular-nums text-neutral-500`}>
                    {lead.durationSeconds !== null ? `${lead.durationSeconds}秒` : "—"}
                  </td>
                  <td
                    className={`${TD} text-right tabular-nums ${
                      mins !== null && mins > 5 ? "text-red-600 dark:text-red-400" : "text-neutral-500"
                    }`}
                  >
                    {mins === null ? "—" : `${mins}分`}
                  </td>
                  <td className={TD}>
                    {lead.recordingUrl ? (
                      <a
                        href={lead.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#9e8d70] hover:underline"
                      >
                        聞く
                      </a>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
