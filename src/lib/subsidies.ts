// 台帳から「この会社に使える制度」を絞り込む。
//
// AI に丸投げすると、存在しない制度を作ったり締切を取り違えたりする。
// そこで機械的に決まること（都道府県・締切・業種・適合度）はここで確定させ、
// AI には「絞り込んだ候補の中で、この会社にどう提案するか」だけを考えさせる。

import {
  SUBSIDIES,
  LEDGER_UPDATED_AT,
  type Subsidy,
  type Prefecture,
  type Industry,
} from "@/data/subsidies";

/** 営業が架電前に入力する、相手企業の情報 */
export type CompanyProfile = {
  prefecture: Prefecture;
  industry?: Industry;
  /** 従業員数。助成上限の区分に効く */
  employees?: number;
  /** 事業場内最低賃金（時給・円）。業務改善助成金の助成率が 4/5 か 3/4 かの分かれ目 */
  hourlyWage?: number;
  /** 賃上げに前向きか。賃上げ要件のある制度を出すかどうかの判断に使う */
  willRaiseWage?: boolean;
  /** 想定している投資額（円） */
  budget?: number;
  /** 抱えている課題。AI への申し送りに使う */
  issue?: string;
};

/** 締切までの日数で分けた、営業としての現実的な扱い */
export type Urgency =
  /** 60日以上ある。新規開拓から十分間に合う */
  | "comfortable"
  /** 30〜59日。急げば間に合う */
  | "tight"
  /** 30日未満。新規では厳しく、既存商談向け */
  | "existing-only"
  /** これから公募が開く。今が仕込み期 */
  | "upcoming"
  /** 締切なし・随時受付 */
  | "rolling";

export type Candidate = {
  subsidy: Subsidy;
  /** 優先度スコア。高いほど先に提案する */
  score: number;
  urgency: Urgency;
  /** 締切までの日数。null は締切なしまたは未定 */
  daysLeft: number | null;
  /** なぜこの会社に合うと判断したか */
  reasons: string[];
  /** 注意すべき点。要件を満たさない可能性があるものを含む */
  cautions: string[];
};

/** 新規開拓から申請までに最低限必要な日数。ここを下回ると既存商談向けに落とす */
const MIN_LEAD_DAYS = 30;
/** 余裕をもって商談を組める日数 */
const COMFORTABLE_LEAD_DAYS = 60;

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 3600 * 1000));
}

/** JST の今日。締切判定は日本時間で行う */
function todayJst(now = new Date()): Date {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ---------------------------------------------------------------------------
// 業務改善助成金の助成額計算
// ---------------------------------------------------------------------------

export type GyomuKaizenCourse = 50 | 70 | 90;

/**
 * 業務改善助成金の助成上限額（円）。
 * コース × 引き上げる労働者数 × 事業場規模（30人未満かどうか）で決まる。
 * 10人以上の区分は特例事業者のみが対象。
 */
const GYOMU_KAIZEN_LIMITS: Record<
  GyomuKaizenCourse,
  { upTo: number; normal: number; under30: number }[]
> = {
  50: [
    { upTo: 1, normal: 300_000, under30: 400_000 },
    { upTo: 3, normal: 400_000, under30: 700_000 },
    { upTo: 5, normal: 700_000, under30: 700_000 },
    { upTo: 7, normal: 900_000, under30: 900_000 },
    { upTo: 9, normal: 1_100_000, under30: 1_100_000 },
    { upTo: Infinity, normal: 1_300_000, under30: 1_300_000 },
  ],
  70: [
    { upTo: 1, normal: 400_000, under30: 500_000 },
    { upTo: 3, normal: 500_000, under30: 1_000_000 },
    { upTo: 5, normal: 1_300_000, under30: 1_300_000 },
    { upTo: 7, normal: 1_800_000, under30: 1_800_000 },
    { upTo: 9, normal: 2_300_000, under30: 2_300_000 },
    { upTo: Infinity, normal: 3_000_000, under30: 3_000_000 },
  ],
  90: [
    { upTo: 1, normal: 900_000, under30: 1_000_000 },
    { upTo: 3, normal: 1_500_000, under30: 2_400_000 },
    { upTo: 5, normal: 2_700_000, under30: 2_700_000 },
    { upTo: 7, normal: 3_600_000, under30: 3_600_000 },
    { upTo: 9, normal: 4_500_000, under30: 4_500_000 },
    { upTo: Infinity, normal: 6_000_000, under30: 6_000_000 },
  ],
};

export type GyomuKaizenEstimate = {
  course: GyomuKaizenCourse;
  /** 4/5 か 3/4 */
  rate: number;
  rateLabel: string;
  limit: number;
  /** 投資額 × 助成率 と 上限額 の小さいほう。投資額が未入力なら null */
  estimated: number | null;
  /** 10人以上の区分を使っているか。特例事業者のみ対象という注意が要る */
  needsSpecialStatus: boolean;
  notes: string[];
};

/**
 * 業務改善助成金の助成額を試算する。
 * 顧客に金額を伝えるとき、営業が暗算で間違えるのを防ぐのが目的。
 */
export function estimateGyomuKaizen(
  course: GyomuKaizenCourse,
  raisedWorkers: number,
  opts: { hourlyWage?: number; employees?: number; budget?: number } = {}
): GyomuKaizenEstimate {
  // 助成率は「引上げ前の事業場内最低賃金」で決まる。未入力なら低いほうに倒して見積もる
  const under1050 = opts.hourlyWage !== undefined ? opts.hourlyWage < 1050 : false;
  const rate = under1050 ? 4 / 5 : 3 / 4;
  const rateLabel = under1050 ? "4/5" : "3/4";

  const under30 = opts.employees !== undefined && opts.employees < 30;
  const table = GYOMU_KAIZEN_LIMITS[course];
  const row = table.find((r) => raisedWorkers <= r.upTo) ?? table[table.length - 1];
  const limit = under30 ? row.under30 : row.normal;

  const estimated =
    opts.budget !== undefined ? Math.min(Math.floor(opts.budget * rate), limit) : null;

  const notes: string[] = [];
  if (opts.hourlyWage === undefined) {
    notes.push("事業場内最低賃金が未入力のため、助成率は低いほうの3/4で計算しています");
  }
  if (opts.employees === undefined) {
    notes.push("従業員数が未入力のため、事業場規模30人未満の優遇区分は適用していません");
  }
  const needsSpecialStatus = raisedWorkers >= 10;
  if (needsSpecialStatus) {
    notes.push("10人以上の区分は特例事業者のみが対象です。該当しない場合は8〜9人の区分になります");
  }

  return { course, rate, rateLabel, limit, estimated, needsSpecialStatus, notes };
}

// ---------------------------------------------------------------------------
// 絞り込み
// ---------------------------------------------------------------------------

function matchesPrefecture(s: Subsidy, pref: Prefecture): boolean {
  return s.prefectures === "all" || s.prefectures.includes(pref);
}

function matchesIndustry(s: Subsidy, industry?: Industry): boolean {
  // 業種限定のない制度は誰でも対象
  if (s.industries === null) return true;
  // 業種未入力なら、業種限定の制度も候補には残す（営業が判断できるように）
  if (!industry) return true;
  return s.industries.includes(industry);
}

function urgencyOf(s: Subsidy, today: Date): { urgency: Urgency; daysLeft: number | null } {
  if (s.status === "upcoming") {
    return { urgency: "upcoming", daysLeft: s.deadline ? daysBetween(today, parseDate(s.deadline)) : null };
  }
  if (!s.deadline) return { urgency: "rolling", daysLeft: null };

  const left = daysBetween(today, parseDate(s.deadline));
  if (left < 0) return { urgency: "existing-only", daysLeft: left };
  if (left < MIN_LEAD_DAYS) return { urgency: "existing-only", daysLeft: left };
  if (left < COMFORTABLE_LEAD_DAYS) return { urgency: "tight", daysLeft: left };
  return { urgency: "comfortable", daysLeft: left };
}

/**
 * 台帳から候補を絞り込み、優先順にする。
 *
 * scratchOnly を true にすると、フルスクラッチが乗らない制度（埼玉・山口のDXツール型など）と
 * ベンダー登録が要る制度（福井のカタログ制）を落とす。
 */
export function findCandidates(
  profile: CompanyProfile,
  opts: { scratchOnly?: boolean; includeClosed?: boolean; now?: Date } = {}
): Candidate[] {
  const today = todayJst(opts.now);
  const scratchOnly = opts.scratchOnly ?? true;

  const out: Candidate[] = [];

  for (const s of SUBSIDIES) {
    if (!matchesPrefecture(s, profile.prefecture)) continue;
    if (!matchesIndustry(s, profile.industry)) continue;

    // 終了済みは既定では出さない。来期の先回りリストが欲しいときだけ含める
    if (!opts.includeClosed && (s.status === "closed" || s.status === "suspended")) continue;

    // 使えないと分かっている制度を出すと、営業が現場で恥をかく
    if (scratchOnly && (s.scratchOk === false || s.vendorRegistrationRequired)) continue;

    const { urgency, daysLeft } = urgencyOf(s, today);
    if (daysLeft !== null && daysLeft < 0 && !opts.includeClosed) continue;

    const reasons: string[] = [];
    const cautions: string[] = [];
    let score = 0;

    // --- 適合度 ---
    if (s.fit === "A") {
      score += 40;
      reasons.push("システム構築費が対象経費に明記されている");
    } else if (s.fit === "B") {
      score += 25;
      reasons.push("設備投資枠でシステム導入が乗る見込み");
    } else if (s.fit === "C") {
      score += 10;
      cautions.push("限定条件つき。事務局への確認が必要");
    }

    // --- 助成金は採択審査がないぶん強い ---
    if (s.category === "助成金") {
      score += 15;
      reasons.push("助成金なので要件を満たせば原則支給される（採択審査で落ちない）");
    }

    // --- 締切までの余裕 ---
    if (urgency === "comfortable") {
      score += 25;
      reasons.push(`締切まで${daysLeft}日あり、新規開拓から十分間に合う`);
    } else if (urgency === "tight") {
      score += 12;
      cautions.push(`締切まで${daysLeft}日。急がないと間に合わない`);
    } else if (urgency === "upcoming") {
      score += 30;
      reasons.push(
        s.opensAt
          ? `${s.opensAt}に公募開始。公募前に商談を作れるので競合より先に動ける`
          : "これから公募が開く。今が仕込み期"
      );
    } else if (urgency === "rolling") {
      score += 20;
      reasons.push("随時受付のため締切に追われずに商談を育てられる");
    } else {
      cautions.push(
        daysLeft !== null && daysLeft >= 0
          ? `締切まで${daysLeft}日しかない。新規開拓では間に合わないので既存商談向け`
          : "締切を過ぎている"
      );
    }

    // --- 金額 ---
    if (s.maxAmount !== null) {
      if (s.maxAmount >= 10_000_000) score += 15;
      else if (s.maxAmount >= 3_000_000) score += 10;
      else if (s.maxAmount >= 1_000_000) score += 5;
    }
    if (profile.budget !== undefined && s.maxAmount !== null && s.maxAmount < profile.budget * 0.3) {
      cautions.push(
        `想定投資額に対して上限が小さい（上限${(s.maxAmount / 10000).toLocaleString()}万円）。単独では効果が薄い`
      );
      score -= 10;
    }

    // --- 賃上げ要件 ---
    const needsWageRaise = s.requirements.some((r) => /賃上げ|引き上げ|引上げ|最低賃金/.test(r));
    if (needsWageRaise) {
      if (profile.willRaiseWage === false) {
        cautions.push("賃上げが要件。賃上げの予定がないなら通らない");
        score -= 25;
      } else if (profile.willRaiseWage === true) {
        score += 10;
        reasons.push("賃上げ意向があるため要件を満たしやすい");
      } else {
        cautions.push("賃上げが要件。相手の賃上げ意向を確認すること");
      }
    }

    // --- 業務改善助成金だけの追加判定。助成率の分かれ目が営業トークに直結する ---
    if (s.id === "mhlw-gyomu-kaizen" && profile.hourlyWage !== undefined) {
      if (profile.hourlyWage < 1050) {
        score += 10;
        reasons.push(`事業場内最低賃金が${profile.hourlyWage}円なので助成率4/5が適用される`);
      } else {
        reasons.push(`事業場内最低賃金が${profile.hourlyWage}円のため助成率は3/4`);
      }
    }

    // --- 業種特化はターゲットが明確なぶん刺さりやすい ---
    if (s.industries !== null && profile.industry && s.industries.includes(profile.industry)) {
      score += 20;
      reasons.push(`${profile.industry}向けの専用制度でターゲットが明確`);
    }

    out.push({ subsidy: s, score, urgency, daysLeft, reasons, cautions });
  }

  return out.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// 台帳の鮮度
// ---------------------------------------------------------------------------

/** これを超えたら画面で警告する。補助金の公募サイクルは1〜2か月単位で動くため */
export const LEDGER_STALE_DAYS = 60;

/** 台帳を最後に人が確認してから何日経ったか */
export function ledgerAgeDays(now = new Date()): number {
  return daysBetween(parseDate(LEDGER_UPDATED_AT), todayJst(now));
}

/**
 * 台帳が古くなっていないか。
 * 古い台帳を黙って使い続けるのが一番危ない——締切の過ぎた制度を
 * 顧客に案内してしまう。気づけるように画面へ出す。
 */
export function ledgerFreshness(now = new Date()): {
  updatedAt: string;
  ageDays: number;
  stale: boolean;
} {
  const ageDays = ledgerAgeDays(now);
  return { updatedAt: LEDGER_UPDATED_AT, ageDays, stale: ageDays > LEDGER_STALE_DAYS };
}

/** 候補を AI に渡すための、余計な情報を落とした形 */
export function toPromptPayload(candidates: Candidate[]) {
  return candidates.map((c) => ({
    id: c.subsidy.id,
    name: c.subsidy.name,
    authority: c.subsidy.authority,
    category: c.subsidy.category,
    status: c.subsidy.status,
    deadline: c.subsidy.deadline,
    opensAt: c.subsidy.opensAt,
    deadlineNote: c.subsidy.deadlineNote,
    rate: c.subsidy.rate,
    maxAmount: c.subsidy.maxAmount,
    amountNote: c.subsidy.amountNote,
    requirements: c.subsidy.requirements,
    gotchas: c.subsidy.gotchas,
    daysLeft: c.daysLeft,
    urgency: c.urgency,
    reasons: c.reasons,
    cautions: c.cautions,
  }));
}
