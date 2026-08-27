// ナーチャリング（メルマガ / マーケティングオートメーション）の型・区分・ユーティリティ。
//
// DB に触らないものだけを置く。画面から import されるため、
// ここに pool を持ち込むと pg がブラウザ側のバンドルに入ってビルドが落ちる。
// 対になる DB アクセスは src/lib/nurturing.ts、DDL は src/lib/schema.ts。
//
// アポ獲得管理（sales_leads）で「教育が必要」と判断したリードを、
// このナーチャリング領域（購読者）へ送客し、メルマガ配信・開封/クリック計測・
// セグメント配信・ステップメールを回す。

import { todayJst } from "@/lib/sales-types";

export { todayJst };

// ---------------------------------------------------------------------------
// 区分
// ---------------------------------------------------------------------------

/** 購読者の状態。購読中だけが配信対象。停止・バウンス・配信解除には送らない */
export const SUBSCRIBER_STATUSES = ["購読中", "停止", "バウンス", "配信解除"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

/** 配信対象になる状態 */
export const SENDABLE_STATUS: SubscriberStatus = "購読中";

/** 購読者の流入元 */
export const SUBSCRIBER_SOURCES = ["アポ獲得", "手動追加", "インポート", "フォーム"] as const;
export type SubscriberSource = (typeof SUBSCRIBER_SOURCES)[number];

/** キャンペーン（メルマガ一斉配信）の状態 */
export const CAMPAIGN_STATUSES = ["下書き", "予約", "送信中", "送信済", "停止"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * 配信明細（1通ごと）の状態。Resend の送信結果・Webhook で更新する。
 * queued→sent→delivered と進み、開封で opened、クリックで clicked。
 */
export const RECIPIENT_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
  "unsubscribed",
] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

/** シナリオ（ステップメール）の状態 */
export const AUTOMATION_STATUSES = ["有効", "停止"] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

/** シナリオの起動条件 */
export const AUTOMATION_TRIGGERS = ["購読者追加", "リスト追加"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

/** 購読者。email が実体。アポ獲得リードから送客されると leadId が入る */
export type Subscriber = {
  id: number;
  email: string;
  company: string | null;
  name: string | null;
  status: SubscriberStatus;
  source: string | null;
  /** 送客元のアポ獲得リード（sales_leads.id）。手動追加なら null */
  leadId: number | null;
  industry: string | null;
  prefecture: string | null;
  owner: string | null;
  note: string | null;
  /** 配信停止リンク用の推測不能なトークン */
  unsubscribeToken: string;
  subscribedOn: string | null;
  unsubscribedOn: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** リスト（セグメント）。購読者を静的に束ねる */
export type NurturingList = {
  id: number;
  name: string;
  description: string | null;
  /** バッジ色（table-ui のトーン名 or CSS 色）。一覧で見分ける用 */
  color: string | null;
  /** 所属購読者数（クエリで数える。保存しない） */
  memberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

/** キャンペーン（メルマガ）。1回の一斉配信 */
export type Campaign = {
  id: number;
  name: string;
  subject: string | null;
  /** プリヘッダー（受信箱で件名の後に見える一文） */
  preheader: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  /** 配信対象リスト。null = 全購読者 */
  listId: number | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentStartedAt: string | null;
  sentFinishedAt: string | null;
  // 集計（配信明細から数える。表示は集計を優先し、保存値はキャッシュ）
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

/** 配信明細。キャンペーン×購読者ごとに1行。開封/クリックの計測もここ */
export type CampaignRecipient = {
  id: number;
  campaignId: number;
  subscriberId: number;
  email: string;
  status: RecipientStatus;
  sentAt: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  firstClickedAt: string | null;
  clickCount: number;
  /** Resend のメッセージID（Webhook 突合用） */
  providerMessageId: string | null;
  error: string | null;
};

/** シナリオ（ステップメール）。トリガーで購読者を登録し、ステップを順に送る */
export type Automation = {
  id: number;
  name: string;
  trigger: string | null;
  /** trigger が「リスト追加」のとき対象リスト */
  listId: number | null;
  status: AutomationStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

/** シナリオの1ステップ。前ステップから delayDays 待って送る */
export type AutomationStep = {
  id: number;
  automationId: number;
  stepOrder: number;
  delayDays: number;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
};

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** 率（%）を小数第1位まで。母数0なら0 */
export function rate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** メールアドレスの緩い妥当性チェック（送信前の足切り用） */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
