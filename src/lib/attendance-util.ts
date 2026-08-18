// 出勤スケジュールの純粋ロジック（DBに触れない）。サーバー・クライアント両方から使う。
export type WeeklyRow = { memberId: string; weekday: number; startTime: string | null };
export type OverrideRow = { memberId: string; date: string; startTime: string | null; isOff: boolean };

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 出勤スケジュールに出さないメンバー名（運営用アカウント等） */
export const NON_SCHEDULABLE_MEMBER_NAMES = ["シークアド運営"];

/** 出勤スケジュールの対象にするメンバーか（運営アカウントを除く） */
export function isSchedulableMember(name: string | undefined | null): boolean {
  return !NON_SCHEDULABLE_MEMBER_NAMES.includes((name ?? "").trim());
}

/** 'YYYY-MM-DD' の曜日（0=日..6=土） */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** 今日（JST）の YYYY-MM-DD */
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/**
 * ある日の各メンバーの出勤を確定する。
 * 優先順位: その日の上書き > 曜日デフォルト。
 * 返すのは「その日に出勤する人（時刻あり）」のみ、時刻の早い順。
 */
export function resolveForDate(
  members: { id: string; name: string; iconUrl?: string }[],
  weekly: WeeklyRow[],
  overrides: OverrideRow[],
  date: string
): { memberId: string; name: string; iconUrl?: string; startTime: string }[] {
  const wd = weekdayOf(date);
  const weeklyMap = new Map<string, string | null>();
  for (const w of weekly) if (w.weekday === wd) weeklyMap.set(w.memberId, w.startTime);
  const ovMap = new Map<string, OverrideRow>();
  for (const o of overrides) if (o.date === date) ovMap.set(o.memberId, o);

  const out: { memberId: string; name: string; iconUrl?: string; startTime: string }[] = [];
  for (const m of members) {
    const ov = ovMap.get(m.id);
    let start: string | null;
    if (ov) start = ov.isOff ? null : ov.startTime;
    else start = weeklyMap.get(m.id) ?? null;
    if (start) out.push({ memberId: m.id, name: m.name, iconUrl: m.iconUrl, startTime: start });
  }
  out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
}
