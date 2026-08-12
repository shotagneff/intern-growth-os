// Callforce（AI架電サービス）の反響リードを読み書きする。
//
// リードの記録は Callforce 側の Supabase にある。こちらに複製すると
// 「どちらが正か」が曖昧になり、LINE通知の対応済み判定とズレる。
// そのため同期はせず、必要なときに直接読みに行く。
//
// 必要な環境変数:
//   CALLFORCE_SUPABASE_URL          例 https://xxxx.supabase.co
//   CALLFORCE_SUPABASE_SERVICE_KEY  service_role キー（サーバー側だけで使う）

export type LeadStatus = "未対応" | "対応中" | "アポ獲得" | "追客中" | "失注" | "対象外";

export const LEAD_STATUSES: LeadStatus[] = [
  "未対応",
  "対応中",
  "アポ獲得",
  "追客中",
  "失注",
  "対象外",
];

export type Lead = {
  id: string;
  /** demo_call / ad_form / web_estimate */
  source: string;
  /** 受電デモ / 架電デモ / 見積もり など */
  demoType: string | null;
  /** 流入元（Retell受電デモ / homepage / Meta広告 など） */
  inflow: string | null;
  phoneNumber: string;
  companyName: string | null;
  /** 新規 / 既存 / 身内 */
  callerType: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  assignedTo: string;
  status: LeadStatus;
  note: string | null;
  createdAt: string;
  /** 架電した時刻。null なら未架電 */
  respondedAt: string | null;
  respondedHow: string | null;
  /** 通知を出した時刻。初動の速さはここからの差で測る */
  notifiedAt: string | null;
};

type Row = Record<string, unknown>;

function config(): { url: string; key: string } | null {
  const url = process.env.CALLFORCE_SUPABASE_URL;
  const key = process.env.CALLFORCE_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function hasCallforce(): boolean {
  return !!config();
}

async function callforceFetch(path: string, init?: RequestInit): Promise<Response> {
  const cfg = config();
  if (!cfg) throw new Error("CALLFORCE_SUPABASE_URL / CALLFORCE_SUPABASE_SERVICE_KEY が未設定です");
  return fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

function toLead(r: Row): Lead {
  return {
    id: String(r.id),
    source: String(r.source ?? ""),
    demoType: (r.demo_type as string) ?? null,
    inflow: (r.inflow as string) ?? null,
    phoneNumber: String(r.phone_number ?? ""),
    companyName: (r.company_name as string) ?? null,
    callerType: (r.caller_type as string) ?? null,
    durationSeconds: (r.duration_seconds as number) ?? null,
    recordingUrl: (r.recording_url as string) ?? null,
    assignedTo: String(r.assigned_to ?? ""),
    status: (r.status as LeadStatus) ?? "未対応",
    note: (r.note as string) ?? null,
    createdAt: String(r.created_at ?? ""),
    respondedAt: (r.responded_at as string) ?? null,
    respondedHow: (r.responded_how as string) ?? null,
    notifiedAt: (r.notified_at as string) ?? null,
  };
}

/** 反響リードを新しい順に取得する */
export async function listLeads(limit = 500): Promise<Lead[]> {
  const res = await callforceFetch(
    `lead_alerts?select=*&order=created_at.desc&limit=${limit}`
  );
  if (!res.ok) {
    throw new Error(`Callforce の取得に失敗しました (${res.status})`);
  }
  return ((await res.json()) as Row[]).map(toLead);
}

/** 対応状況・担当・メモを更新する */
export async function updateLead(
  id: string,
  patch: { status?: LeadStatus; assignedTo?: string; note?: string }
): Promise<void> {
  const body: Row = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.assignedTo !== undefined) body.assigned_to = patch.assignedTo;
  if (patch.note !== undefined) body.note = patch.note;

  const res = await callforceFetch(`lead_alerts?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Callforce の更新に失敗しました (${res.status})`);
  }
}

/** 担当者の候補。Callforce 側の名簿をそのまま使う */
export async function listResponders(): Promise<string[]> {
  const res = await callforceFetch(`lead_responders?select=name&is_active=eq.true&order=name`);
  if (!res.ok) return [];
  return ((await res.json()) as Row[]).map((r) => String(r.name));
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

export type WeeklyRow = {
  /** 週の始まり（月曜）。YYYY-MM-DD */
  weekStart: string;
  total: number;
  responded: number;
  /** 5分以内に架電できた件数 */
  withinFive: number;
  appointments: number;
};

/** JST の日付文字列にする */
function jstDate(iso: string): Date {
  return new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
}

/** その日を含む週の月曜日（JST）を YYYY-MM-DD で返す */
function weekStartOf(iso: string): string {
  const d = jstDate(iso);
  const dow = (d.getUTCDay() + 6) % 7; // 月曜=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** 初動の分数。通知から架電までの差 */
export function firstResponseMinutes(lead: Lead): number | null {
  if (!lead.respondedAt || !lead.notifiedAt) return null;
  const diff = new Date(lead.respondedAt).getTime() - new Date(lead.notifiedAt).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

export type DailyRow = {
  /** YYYY-MM-DD（JST） */
  date: string;
  total: number;
  responded: number;
  withinFive: number;
  appointments: number;
};

/**
 * 日ごとに集計する。新しい日が先頭。
 * リードが1件も無かった日も 0 で埋める。抜けたまま並べると
 * 「反響が途切れた日」が見えず、勢いを読み違える。
 */
export function dailySummary(leads: Lead[], days = 14): DailyRow[] {
  const map = new Map<string, DailyRow>();
  for (const lead of leads) {
    if (!lead.createdAt) continue;
    const key = jstDate(lead.createdAt).toISOString().slice(0, 10);
    const row = map.get(key) ?? { date: key, total: 0, responded: 0, withinFive: 0, appointments: 0 };
    row.total++;
    if (lead.respondedAt) row.responded++;
    const m = firstResponseMinutes(lead);
    if (m !== null && m <= 5) row.withinFive++;
    if (lead.status === "アポ獲得") row.appointments++;
    map.set(key, row);
  }

  // 直近 days 日を、空の日も含めて並べる
  const out: DailyRow[] = [];
  const cursor = jstDate(new Date().toISOString());
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
    out.push(map.get(key) ?? { date: key, total: 0, responded: 0, withinFive: 0, appointments: 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out;
}

/** 週ごとに集計する。新しい週が先頭 */
export function weeklySummary(leads: Lead[]): WeeklyRow[] {
  const map = new Map<string, WeeklyRow>();
  for (const lead of leads) {
    if (!lead.createdAt) continue;
    const key = weekStartOf(lead.createdAt);
    const row =
      map.get(key) ??
      { weekStart: key, total: 0, responded: 0, withinFive: 0, appointments: 0 };
    row.total++;
    if (lead.respondedAt) row.responded++;
    const m = firstResponseMinutes(lead);
    if (m !== null && m <= 5) row.withinFive++;
    if (lead.status === "アポ獲得") row.appointments++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

export type Breakdown = {
  name: string;
  count: number;
  /** アポ獲得の件数 */
  appointments: number;
  /** 架電済みの件数 */
  responded: number;
};

/** 任意のキーで割る。件数の多い順 */
function groupBy(leads: Lead[], keyOf: (l: Lead) => string): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const lead of leads) {
    const key = keyOf(lead);
    const row = map.get(key) ?? { name: key, count: 0, appointments: 0, responded: 0 };
    row.count++;
    if (lead.status === "アポ獲得") row.appointments++;
    if (lead.respondedAt) row.responded++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** 流入元ごと */
export function byInflow(leads: Lead[]): Breakdown[] {
  return groupBy(leads, (l) => l.inflow || "（不明）");
}

/** 対応状況ごと */
export function byStatus(leads: Lead[]): Breakdown[] {
  return groupBy(leads, (l) => l.status);
}

/** 担当者ごと */
export function byAssignee(leads: Lead[]): Breakdown[] {
  return groupBy(leads, (l) => l.assignedTo || "（未割当）");
}

/** 新規 / 既存 などの発信者区分ごと */
export function byCallerType(leads: Lead[]): Breakdown[] {
  return groupBy(leads, (l) => l.callerType || "（不明）");
}

/** 受電デモ / 架電デモ などの種別ごと */
export function byDemoType(leads: Lead[]): Breakdown[] {
  return groupBy(leads, (l) => l.demoType || "（不明）");
}

/**
 * 曜日 × 時間帯の件数（JST）。
 * どの曜日・何時に反響が来るかが分かれば、人を張る時間を決められる。
 * 時間は 9時〜20時（通知を出す時間帯）に絞る。
 */
export type Heatmap = {
  hours: number[];
  /** rows[曜日][時間] の件数。曜日は 月=0 〜 日=6 */
  rows: number[][];
  max: number;
};

export function byWeekdayHour(leads: Lead[], fromHour = 9, toHour = 20): Heatmap {
  const hours: number[] = [];
  for (let h = fromHour; h <= toHour; h++) hours.push(h);

  const rows = Array.from({ length: 7 }, () => new Array(hours.length).fill(0));
  let max = 0;
  for (const lead of leads) {
    if (!lead.createdAt) continue;
    const d = jstDate(lead.createdAt);
    const dow = (d.getUTCDay() + 6) % 7; // 月曜=0
    const idx = hours.indexOf(d.getUTCHours());
    if (idx < 0) continue; // 時間外に来たものはここでは数えない
    rows[dow][idx]++;
    if (rows[dow][idx] > max) max = rows[dow][idx];
  }
  return { hours, rows, max };
}

/**
 * デモ通話の長さの分布。
 * 短いほど途中で切られている。何秒まで聞いてもらえているかは
 * トークの出来を測る手がかりになる。
 */
export function durationBuckets(leads: Lead[]): { name: string; count: number }[] {
  const buckets = [
    { name: "〜30秒", max: 30 },
    { name: "30〜60秒", max: 60 },
    { name: "60〜90秒", max: 90 },
    { name: "90〜120秒", max: 120 },
    { name: "120秒〜", max: Infinity },
  ];
  const out = buckets.map((b) => ({ name: b.name, count: 0 }));
  for (const lead of leads) {
    if (lead.durationSeconds === null) continue;
    const i = buckets.findIndex((b) => lead.durationSeconds! <= b.max);
    out[i < 0 ? out.length - 1 : i].count++;
  }
  return out;
}

/** 初動のまとめ。母数が小さいうちは中央値を鵜呑みにしない */
export function responseStats(leads: Lead[]): {
  /** 初動を計算できた件数。これが小さいうちは中央値に意味がない */
  sample: number;
  median: number | null;
  withinFive: number;
  withinFiveRate: number | null;
} {
  const times = leads.map(firstResponseMinutes).filter((m): m is number => m !== null);
  const sorted = [...times].sort((a, b) => a - b);
  const withinFive = times.filter((m) => m <= 5).length;
  return {
    sample: times.length,
    median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    withinFive,
    withinFiveRate: times.length ? Math.round((withinFive / times.length) * 100) : null,
  };
}
