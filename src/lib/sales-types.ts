// アポ獲得管理の型・区分・日付計算。
//
// DB に触らないものだけを置く。画面から import されるため、
// ここに pool を持ち込むと pg がブラウザ側のバンドルに入ってビルドが落ちる。
//
// 元の説明:
// アポ獲得管理。
//
// スプレッドシート「アポイント獲得」からの移管。
// 元は5シートが 案件ID で手作業のコピペで繋がっていた。
// その連鎖をサーバー側の処理として持ち込む。
//
//   リード ──(案件化済)──> 案件 ──(受注)──> 顧客
//                            └─(失注)──> 失注一覧（= 失注フェーズの案件を絞ったもの）
//
// 計算で出る値（想定年間総額・契約経過月数・LTV等）は列に持たない。
// 保存すると元の値を直したときに古い数字が残る。

// ---------------------------------------------------------------------------
// 区分
// ---------------------------------------------------------------------------

/** リードのフェーズ。案件化済になると案件へ進む */
export const LEAD_PHASES = ["リード", "初回面談", "案件化済", "協業", "失注"] as const;
export type LeadPhase = (typeof LEAD_PHASES)[number];

/** 案件のフェーズ。受注で顧客になり、失注で失注一覧に出る */
export const DEAL_PHASES = ["提案", "見積", "クロージング", "受注", "失注"] as const;
export type DealPhase = (typeof DEAL_PHASES)[number];

/**
 * フェーズごとの受注確度。
 * 元のシートは人が手で入れていたため、受注なのに0%の行が残っていた。
 * フェーズから自動で決めれば、そのずれは起きない。
 */
export const WIN_PROBABILITY: Record<DealPhase, number> = {
  提案: 50,
  見積: 70,
  クロージング: 85,
  受注: 100,
  失注: 0,
};

/** 確度。リードの温度感 */
export const GRADES = ["A（高）", "B（中高）", "C（中）", "D（低）", "不明"] as const;

/** リードソース種別 */
export const LEAD_SOURCES = [
  "テレアポ",
  "紹介",
  "イベント",
  "SNS・広告",
  "Web問合せ",
  "DM",
  "大学",
  "その他",
] as const;

/** 顧客のステータス */
export const CUSTOMER_STATUSES = ["稼働", "停止", "解約"] as const;

/** 案件に進んだとみなすフェーズ。ここに入ったら案件を作る */
export const PHASE_MAKES_DEAL: LeadPhase = "案件化済";
/** 顧客になったとみなすフェーズ */
export const PHASE_MAKES_CUSTOMER: DealPhase = "受注";
/** 商談中とみなすフェーズ。パイプラインの母数 */
export const OPEN_DEAL_PHASES: DealPhase[] = ["提案", "見積", "クロージング"];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type Lead = {
  id: number;
  monthLabel: string | null;
  company: string | null;
  owner: string | null;
  phase: LeadPhase;
  grade: string | null;
  registeredOn: string | null;
  ceoName: string | null;
  contactName: string | null;
  contactTitle: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  industry: string | null;
  employeeSize: string | null;
  prefecture: string | null;
  nextAction: string | null;
  nextActionOn: string | null;
  /** アポ/次アクションの時刻 "HH:MM"。ホームの「今日のアポ」で使う */
  nextActionTime: string | null;
  leadSource: string | null;
  referrer: string | null;
  updatedOn: string | null;
  /** 案件化済みか。案件テーブルに同じ案件IDがあるか */
  hasDeal: boolean;
};

export type Deal = {
  id: number;
  company: string | null;
  owner: string | null;
  phase: DealPhase;
  winProbability: number | null;
  nextAction: string | null;
  nextActionOn: string | null;
  proposedOn: string | null;
  monthlyFee: number;
  oneTimeFee: number;
  competitor: string | null;
  service: string | null;
  referrer: string | null;
  lostReason: string | null;
  wonOn: string | null;
  lostOn: string | null;
  createdOn: string | null;
  updatedOn: string | null;
  /** 想定年間総額 = 月額×12 + ショット。保存せず毎回出す */
  annualTotal: number;
  /** 元リードが存在するか。移管時に1件だけ対応するリードが無い案件がある */
  hasLead: boolean;
  /** 顧客になっているか */
  customerId: string | null;
};

export type Customer = {
  id: string;
  company: string | null;
  owner: string | null;
  status: string;
  startedOn: string | null;
  monthlyFee: number;
  ceoName: string | null;
  industry: string | null;
  employeeSize: string | null;
  location: string | null;
  note: string | null;
  dealId: number | null;
  createdOn: string | null;
  updatedOn: string | null;
  /** 契約開始から今日までの満月数 */
  monthsElapsed: number;
  /** 年間継続価値 = 月額×12 */
  annualValue: number;
  /** 累計保守管理費 = 月額×経過月数 */
  cumulativeMonthly: number;
  /** 追加受注額（累計）= 元案件のショット金額 */
  additionalRevenue: number;
  /** LTV実績 = 累計保守 + 追加受注 */
  ltv: number;
};

// ---------------------------------------------------------------------------
// 日付まわり
// ---------------------------------------------------------------------------

/** 今日（JST）。サーバーのタイムゾーンに引きずられないよう明示する */
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** YYYY-MM を取り出す */
export function monthOf(date: string | null): string | null {
  return date ? date.slice(0, 7) : null;
}

/**
 * 契約開始から今日までの満月数。
 * 「4/16開始で今日が8/15」なら3ヶ月。日を跨いでいなければ数えない。
 */
export function monthsBetween(from: string | null, to: string): number {
  if (!from) return 0;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let m = (ty - fy) * 12 + (tm - fm);
  if (td < fd) m -= 1;
  return Math.max(0, m);
}

/** 3テーブルをまとめた形。互いを参照して計算するため一緒に扱う */
export type SalesData = {
  leads: Lead[];
  deals: Deal[];
  customers: Customer[];
};
