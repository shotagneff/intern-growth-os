"use client";

// アポ獲得管理の4つの表（リード / 案件 / 顧客 / 失注）。
//
// 元スプレッドシートの列をそのまま持ってくる。
// 並べ替えて見やすくしたくなるが、営業が毎日見ていた並びを変えると
// 「あの列どこ？」が起きて結局シートに戻る。並びは触らない。

import React, { useMemo, useState } from "react";
import {
  CUSTOMER_STATUSES,
  DEAL_PHASES,
  GRADES,
  LEAD_PHASES,
  LEAD_SOURCES,
  OPEN_DEAL_PHASES,
  type Customer,
  type Deal,
  type DealPhase,
  type Lead,
  type LeadPhase,
} from "@/lib/sales-types";
import { CELL_INPUT, FILL, ROW_HOVER, TD, TH, TONE, TableFrame, ToneSelect, W, yen } from "@/components/table-ui";

const LEAD_PHASE_TONE: Record<LeadPhase, string> = {
  リード: TONE.gray,
  初回面談: TONE.sky,
  案件化済: TONE.yellow,
  協業: TONE.violet,
  失注: TONE.gray,
};

const LEAD_PHASE_FILL: Record<LeadPhase, string> = {
  リード: FILL.none,
  初回面談: FILL.none,
  案件化済: FILL.yellow,
  協業: FILL.violet,
  失注: FILL.gray,
};

const DEAL_PHASE_TONE: Record<DealPhase, string> = {
  提案: TONE.sky,
  見積: TONE.orange,
  クロージング: TONE.orange,
  受注: TONE.yellow,
  失注: TONE.gray,
};

const DEAL_PHASE_FILL: Record<DealPhase, string> = {
  提案: FILL.none,
  見積: FILL.none,
  クロージング: FILL.orange,
  受注: FILL.yellow,
  失注: FILL.gray,
};

const CUSTOMER_STATUS_TONE: Record<string, string> = {
  稼働: TONE.yellow,
  停止: TONE.orange,
  解約: TONE.gray,
};

export type Patch = (kind: "lead" | "deal" | "customer", id: number | string, patch: Record<string, unknown>) => void;

// 業種の候補（元スプレッドシートのプルダウン相当）。datalist で出す。自由入力も可。
const INDUSTRIES = [
  "人材派遣業", "人材紹介業", "SES・受託開発", "IT・ソフトウェア", "Web制作・広告代理店",
  "製造業", "建設業", "不動産業", "卸売業", "小売業", "飲食店", "ホテル・旅館",
  "運送・物流", "軽貨物運送", "タクシー・運輸", "介護・福祉", "医療・クリニック", "歯科医院",
  "調剤薬局", "美容室・サロン", "エステ・リラクゼーション", "教育・スクール", "学習塾",
  "保育・幼児教育", "士業（税理士・社労士・行政書士等）", "金融・保険", "コンサルティング",
  "農林水産業", "エネルギー・環境", "冠婚葬祭", "旅行・レジャー", "警備・ビルメンテナンス",
  "産業廃棄物処理", "その他",
] as const;

// 都道府県（47）
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県",
  "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県",
  "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府",
  "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県",
  "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県",
  "鹿児島県", "沖縄県",
] as const;

function Select({
  value,
  options,
  onChange,
  blank,
}: {
  value: string | null;
  options: readonly string[];
  onChange: (v: string) => void;
  blank?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`${CELL_INPUT} cursor-pointer`}
    >
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** 入力し終えた（フォーカスが外れた）ときだけ保存する。1文字ごとに送らない */
function Text({
  value,
  onCommit,
  type = "text",
  align = "left",
  listId,
}: {
  value: string | number | null;
  onCommit: (v: string) => void;
  type?: "text" | "date" | "number" | "time";
  align?: "left" | "right";
  listId?: string;
}) {
  const [draft, setDraft] = useState(String(value ?? ""));
  React.useEffect(() => setDraft(String(value ?? "")), [value]);
  return (
    <input
      type={type}
      list={listId}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== String(value ?? "")) onCommit(draft);
      }}
      className={`${CELL_INPUT} ${align === "right" ? "text-right tabular-nums" : ""}`}
    />
  );
}

// ---------------------------------------------------------------------------
// リード管理
// ---------------------------------------------------------------------------

const LEAD_FILTERS = ["すべて", "追いかけ中", "案件化済", "失注"] as const;
type LeadFilter = (typeof LEAD_FILTERS)[number];

export function LeadTable({
  leads,
  owners,
  patch,
  onCreate,
}: {
  leads: Lead[];
  owners: string[];
  patch: Patch;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<LeadFilter>("すべて");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "追いかけ中" && (l.phase === "失注" || l.phase === "案件化済")) return false;
      if (filter === "案件化済" && l.phase !== "案件化済") return false;
      if (filter === "失注" && l.phase !== "失注") return false;
      if (!q) return true;
      return [l.company, l.ceoName, l.contactName, l.industry, l.owner, l.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [leads, filter, query]);

  // 業種の候補: 固定リスト + 実データにある既存の業種（元スプレッドシートのプルダウン相当）
  const industryOptions = useMemo(
    () =>
      Array.from(
        new Set([...INDUSTRIES, ...leads.map((l) => (l.industry ?? "").trim()).filter(Boolean)]),
      ),
    [leads],
  );

  return (
    <div className="space-y-3">
      <datalist id="lead-industry">
        {industryOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="lead-pref">
        {PREFECTURES.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <div className="flex flex-wrap items-center gap-2">
        {LEAD_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {f}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="会社名・担当者・業種で絞り込み"
          className="ml-auto w-64 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: "#9e8d70" }}
        >
          <span className="text-lg leading-none">＋</span>
          リードを追加
        </button>
      </div>

      <p className="text-xs text-neutral-400">
        {shown.length}件　フェーズを「案件化済」にすると案件が自動で作られます
        <span className="ml-1 text-[#9e8d70]">／「次回アポ日」を今日にするとホームの「今日のアポイント」に表示されます</span>
      </p>

      <TableFrame>
        <table className="w-full border-collapse">
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["案件ID", "月", "会社名/氏名", "担当者", "次回アポ日", "アポ時刻", "フェーズ", "確度", "登録日", "代表者名",
                "先方担当者名", "役職", "電話番号", "メールアドレス", "WEBページ", "業種", "従業員規模",
                "都道府県", "次回アクション", "リードソース種別", "紹介元", "最終更新日"].map((h) => (
                <th
                  key={h}
                  className={
                    h === "次回アポ日" || h === "アポ時刻"
                      ? `${TH} bg-[#f6f1e7] dark:bg-amber-900/20`
                      : TH
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {shown.map((l) => (
              <tr
                key={l.id}
                className={`${LEAD_PHASE_FILL[l.phase]} ${ROW_HOVER}`}
              >
                <td className={`${TD} tabular-nums text-neutral-400`}>{l.id}</td>
                <td className={`${TD} text-neutral-400`}>{l.monthLabel ?? ""}</td>
                <td className={`${TD} min-w-[14rem] font-medium`}>
                  <Text value={l.company} onCommit={(v) => patch("lead", l.id, { company: v })} />
                </td>
                <td className={`${TD} ${W.owner}`}>
                  <Select value={l.owner} options={owners} blank="—" onChange={(v) => patch("lead", l.id, { owner: v })} />
                </td>
                <td className={`${TD} min-w-[8rem] bg-[#f6f1e7]/60 dark:bg-amber-900/10`}>
                  <Text type="date" value={l.nextActionOn} onCommit={(v) => patch("lead", l.id, { nextActionOn: v })} />
                </td>
                <td className={`${TD} min-w-[6rem] bg-[#f6f1e7]/60 dark:bg-amber-900/10`}>
                  <Text type="time" value={l.nextActionTime} onCommit={(v) => patch("lead", l.id, { nextActionTime: v })} />
                </td>
                <td className={`${TD} ${W.phase}`}>
                  <ToneSelect
                    value={l.phase}
                    options={LEAD_PHASES}
                    tone={LEAD_PHASE_TONE[l.phase]}
                    onChange={(v) => patch("lead", l.id, { phase: v })}
                  />
                </td>
                <td className={`${TD} ${W.grade}`}>
                  <Select value={l.grade} options={GRADES} blank="—" onChange={(v) => patch("lead", l.id, { grade: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={l.registeredOn} onCommit={(v) => patch("lead", l.id, { registeredOn: v })} />
                </td>
                <td className={`${TD} ${W.person}`}>
                  <Text value={l.ceoName} onCommit={(v) => patch("lead", l.id, { ceoName: v })} />
                </td>
                <td className={`${TD} ${W.person}`}>
                  <Text value={l.contactName} onCommit={(v) => patch("lead", l.id, { contactName: v })} />
                </td>
                <td className={`${TD} ${W.title}`}>
                  <Text value={l.contactTitle} onCommit={(v) => patch("lead", l.id, { contactTitle: v })} />
                </td>
                <td className={`${TD} ${W.phone}`}>
                  <Text value={l.phone} onCommit={(v) => patch("lead", l.id, { phone: v })} />
                </td>
                <td className={TD}>
                  <Text value={l.email} onCommit={(v) => patch("lead", l.id, { email: v })} />
                </td>
                <td className={`${TD} max-w-[16rem] overflow-hidden text-ellipsis`}>
                  {l.website ? (
                    <a
                      href={l.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {l.website.replace(/^https?:\/\//, "").slice(0, 30)}
                    </a>
                  ) : (
                    <Text value="" onCommit={(v) => patch("lead", l.id, { website: v })} />
                  )}
                </td>
                <td className={`${TD} min-w-[12rem]`}>
                  <Text value={l.industry} onCommit={(v) => patch("lead", l.id, { industry: v })} listId="lead-industry" />
                </td>
                <td className={TD}>
                  <Text value={l.employeeSize} onCommit={(v) => patch("lead", l.id, { employeeSize: v })} />
                </td>
                <td className={`${TD} min-w-[7.5rem]`}>
                  <Text value={l.prefecture} onCommit={(v) => patch("lead", l.id, { prefecture: v })} listId="lead-pref" />
                </td>
                <td className={`${TD} min-w-[16rem]`}>
                  <Text value={l.nextAction} onCommit={(v) => patch("lead", l.id, { nextAction: v })} />
                </td>
                <td className={TD}>
                  <Select
                    value={l.leadSource}
                    options={LEAD_SOURCES}
                    blank="—"
                    onChange={(v) => patch("lead", l.id, { leadSource: v })}
                  />
                </td>
                <td className={TD}>
                  <Text value={l.referrer} onCommit={(v) => patch("lead", l.id, { referrer: v })} />
                </td>
                <td className={`${TD} text-neutral-400 tabular-nums`}>{l.updatedOn ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 案件管理
// ---------------------------------------------------------------------------

export function DealTable({ deals, owners, patch }: { deals: Deal[]; owners: string[]; patch: Patch }) {
  const open = deals.filter((d) => OPEN_DEAL_PHASES.includes(d.phase));
  const pipeline = open.reduce((s, d) => s + d.annualTotal, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-400">
        {deals.length}件　うち商談中 {open.length}件・想定年間総額 {yen(pipeline)}
        フェーズを「受注」にすると顧客が自動で作られます
      </p>

      <TableFrame>
        <table className="w-full border-collapse">
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["案件ID", "会社名/氏名", "担当者", "フェーズ", "受注確度", "次回アクション", "次回アクション日",
                "提案日", "保守管理費(月額)", "ショット金額", "想定年間総額", "競合", "提案サービス", "紹介元",
                "失注理由", "受注日", "失注日", "作成日", "最終更新日"].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {deals.map((d) => (
              <tr
                key={d.id}
                className={`${DEAL_PHASE_FILL[d.phase]} ${ROW_HOVER}`}
              >
                <td className={`${TD} tabular-nums text-neutral-400`}>
                  {d.id}
                  {!d.hasLead && (
                    <span className="ml-1 text-[10px] text-orange-600 dark:text-orange-400" title="対応するリードがありません">
                      ⚠
                    </span>
                  )}
                </td>
                <td className={`${TD} min-w-[14rem] font-medium`}>
                  <Text value={d.company} onCommit={(v) => patch("deal", d.id, { company: v })} />
                </td>
                <td className={`${TD} ${W.owner}`}>
                  <Select value={d.owner} options={owners} blank="—" onChange={(v) => patch("deal", d.id, { owner: v })} />
                </td>
                <td className={`${TD} ${W.phase}`}>
                  <ToneSelect
                    value={d.phase}
                    options={DEAL_PHASES}
                    tone={DEAL_PHASE_TONE[d.phase]}
                    onChange={(v) => patch("deal", d.id, { phase: v })}
                  />
                </td>
                <td className={`${TD} text-right tabular-nums text-neutral-500`}>
                  {d.winProbability === null ? "" : `${d.winProbability}%`}
                </td>
                <td className={`${TD} min-w-[16rem]`}>
                  <Text value={d.nextAction} onCommit={(v) => patch("deal", d.id, { nextAction: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={d.nextActionOn} onCommit={(v) => patch("deal", d.id, { nextActionOn: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={d.proposedOn} onCommit={(v) => patch("deal", d.id, { proposedOn: v })} />
                </td>
                <td className={TD}>
                  <Text
                    type="number"
                    align="right"
                    value={d.monthlyFee}
                    onCommit={(v) => patch("deal", d.id, { monthlyFee: Number(v || 0) })}
                  />
                </td>
                <td className={TD}>
                  <Text
                    type="number"
                    align="right"
                    value={d.oneTimeFee}
                    onCommit={(v) => patch("deal", d.id, { oneTimeFee: Number(v || 0) })}
                  />
                </td>
                <td className={`${TD} text-right font-medium tabular-nums`}>{yen(d.annualTotal)}</td>
                <td className={TD}>
                  <Text value={d.competitor} onCommit={(v) => patch("deal", d.id, { competitor: v })} />
                </td>
                <td className={TD}>
                  <Text value={d.service} onCommit={(v) => patch("deal", d.id, { service: v })} />
                </td>
                <td className={TD}>
                  <Text value={d.referrer} onCommit={(v) => patch("deal", d.id, { referrer: v })} />
                </td>
                <td className={`${TD} min-w-[12rem]`}>
                  <Text value={d.lostReason} onCommit={(v) => patch("deal", d.id, { lostReason: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={d.wonOn} onCommit={(v) => patch("deal", d.id, { wonOn: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={d.lostOn} onCommit={(v) => patch("deal", d.id, { lostOn: v })} />
                </td>
                <td className={`${TD} text-neutral-400 tabular-nums`}>{d.createdOn ?? ""}</td>
                <td className={`${TD} text-neutral-400 tabular-nums`}>{d.updatedOn ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 顧客管理
// ---------------------------------------------------------------------------

export function CustomerTable({
  customers,
  owners,
  patch,
}: {
  customers: Customer[];
  owners: string[];
  patch: Patch;
}) {
  const mrr = customers.filter((c) => c.status === "稼働").reduce((s, c) => s + c.monthlyFee, 0);
  const ltv = customers.reduce((s, c) => s + c.ltv, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-400">
        {customers.length}社　稼働MRR {yen(mrr)}・LTV実績の合計 {yen(ltv)}
        右側5列は計算で出しています（保存していません）
      </p>

      <TableFrame>
        <table className="w-full border-collapse">
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["顧客ID", "会社名/氏名", "担当者", "ステータス", "顧問契約開始日", "保守管理費(月額)",
                "代表者名", "業種", "従業員規模", "所在地", "備考", "元案件ID", "作成日", "最終更新日"].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
              {["契約経過月数", "年間継続価値", "累計保守管理費", "追加受注額（累計）", "LTV実績"].map((h) => (
                <th key={h} className={`${TH} bg-neutral-50/70 dark:bg-neutral-800/40`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {customers.map((c) => (
              <tr
                key={c.id}
                className={`${c.status === "解約" ? FILL.gray : FILL.none} ${ROW_HOVER}`}
              >
                <td className={`${TD} font-mono text-xs text-neutral-400`}>{c.id}</td>
                <td className={`${TD} min-w-[14rem] font-medium`}>
                  <Text value={c.company} onCommit={(v) => patch("customer", c.id, { company: v })} />
                </td>
                <td className={`${TD} ${W.owner}`}>
                  <Select
                    value={c.owner}
                    options={owners}
                    blank="—"
                    onChange={(v) => patch("customer", c.id, { owner: v })}
                  />
                </td>
                <td className={`${TD} ${W.phase}`}>
                  <ToneSelect
                    value={c.status}
                    options={CUSTOMER_STATUSES}
                    tone={CUSTOMER_STATUS_TONE[c.status] ?? TONE.gray}
                    onChange={(v) => patch("customer", c.id, { status: v })}
                  />
                </td>
                <td className={TD}>
                  <Text type="date" value={c.startedOn} onCommit={(v) => patch("customer", c.id, { startedOn: v })} />
                </td>
                <td className={TD}>
                  <Text
                    type="number"
                    align="right"
                    value={c.monthlyFee}
                    onCommit={(v) => patch("customer", c.id, { monthlyFee: Number(v || 0) })}
                  />
                </td>
                <td className={`${TD} ${W.person}`}>
                  <Text value={c.ceoName} onCommit={(v) => patch("customer", c.id, { ceoName: v })} />
                </td>
                <td className={TD}>
                  <Text value={c.industry} onCommit={(v) => patch("customer", c.id, { industry: v })} />
                </td>
                <td className={TD}>
                  <Text value={c.employeeSize} onCommit={(v) => patch("customer", c.id, { employeeSize: v })} />
                </td>
                <td className={TD}>
                  <Text value={c.location} onCommit={(v) => patch("customer", c.id, { location: v })} />
                </td>
                <td className={`${TD} min-w-[12rem]`}>
                  <Text value={c.note} onCommit={(v) => patch("customer", c.id, { note: v })} />
                </td>
                <td className={`${TD} tabular-nums text-neutral-400`}>{c.dealId ?? ""}</td>
                <td className={`${TD} text-neutral-400 tabular-nums`}>{c.createdOn ?? ""}</td>
                <td className={`${TD} text-neutral-400 tabular-nums`}>{c.updatedOn ?? ""}</td>

                <td className={`${TD} bg-neutral-50/70 text-right tabular-nums dark:bg-neutral-800/40`}>
                  {c.monthsElapsed}ヶ月
                </td>
                <td className={`${TD} bg-neutral-50/70 text-right tabular-nums dark:bg-neutral-800/40`}>
                  {yen(c.annualValue)}
                </td>
                <td className={`${TD} bg-neutral-50/70 text-right tabular-nums dark:bg-neutral-800/40`}>
                  {yen(c.cumulativeMonthly)}
                </td>
                <td className={`${TD} bg-neutral-50/70 text-right tabular-nums dark:bg-neutral-800/40`}>
                  {yen(c.additionalRevenue)}
                </td>
                <td className={`${TD} bg-neutral-50/70 text-right font-semibold tabular-nums dark:bg-neutral-800/40`}>
                  {yen(c.ltv)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 失注管理
//
// 元シートは別タブだったが、中身は案件管理の失注行と同じ列だった。
// 別で持つと二重管理になるので、案件を絞って出しているだけにする。
// ---------------------------------------------------------------------------

export function LostTable({ deals, patch }: { deals: Deal[]; patch: Patch }) {
  const lost = deals.filter((d) => d.phase === "失注");
  const missed = lost.reduce((s, d) => s + d.annualTotal, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-400">
        {lost.length}件・逃した想定年間総額 {yen(missed)}
        案件のフェーズを「失注」にすると、ここに出ます（別で持っていません）
      </p>

      <TableFrame>
        <table className="w-full border-collapse">
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["案件ID", "会社名", "担当者", "失注理由", "失注日", "保守管理費(月額)", "ショット金額",
                "提案サービス", "競合", "紹介元"].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {lost.map((d) => (
              <tr key={d.id} className={ROW_HOVER}>
                <td className={`${TD} tabular-nums text-neutral-400`}>{d.id}</td>
                <td className={`${TD} min-w-[14rem] font-medium`}>{d.company}</td>
                <td className={TD}>{d.owner}</td>
                <td className={`${TD} min-w-[16rem]`}>
                  <Text value={d.lostReason} onCommit={(v) => patch("deal", d.id, { lostReason: v })} />
                </td>
                <td className={TD}>
                  <Text type="date" value={d.lostOn} onCommit={(v) => patch("deal", d.id, { lostOn: v })} />
                </td>
                <td className={`${TD} text-right tabular-nums`}>{yen(d.monthlyFee)}</td>
                <td className={`${TD} text-right tabular-nums`}>{yen(d.oneTimeFee)}</td>
                <td className={TD}>{d.service ?? ""}</td>
                <td className={TD}>{d.competitor ?? ""}</td>
                <td className={TD}>{d.referrer ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>

      {lost.length > 0 && lost.every((d) => !d.lostReason) && (
        <p className="text-xs text-orange-600 dark:text-orange-400">
          失注理由が1件も入っていません。ここが埋まらないと、なぜ負けたのかを次に活かせません。
        </p>
      )}
    </div>
  );
}
