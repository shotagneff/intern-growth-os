// ナーチャリング（メルマガ / MA）の DB アクセス。サーバ専用。
//
// src/lib/db.ts の pool（Neon Postgres・生 pg）を使う。
// 型・区分は src/lib/nurturing-types.ts、DDL は src/lib/schema.ts。
// アポ獲得（sales_leads）で教育が必要と判断したリードを購読者へ送客し、
// メルマガ配信・開封/クリック計測・セグメント配信を回す。

import { pool } from "@/lib/db";
import { randomUUID } from "crypto";
import type {
  Subscriber,
  NurturingList,
  Campaign,
  CampaignRecipient,
  Automation,
  AutomationStep,
} from "@/lib/nurturing-types";
import { todayJst } from "@/lib/nurturing-types";

type Row = Record<string, unknown>;

// TIMESTAMPTZ → ISO文字列。DATE → YYYY-MM-DD。pg は Date か string で返すため両対応
function iso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}
function dateStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// 行 → 型
// ---------------------------------------------------------------------------
function toSubscriber(r: Row): Subscriber {
  return {
    id: num(r.id),
    email: String(r.email ?? ""),
    company: (r.company as string) ?? null,
    name: (r.name as string) ?? null,
    status: (r.status as Subscriber["status"]) ?? "購読中",
    source: (r.source as string) ?? null,
    leadId: r.lead_id == null ? null : num(r.lead_id),
    industry: (r.industry as string) ?? null,
    prefecture: (r.prefecture as string) ?? null,
    owner: (r.owner as string) ?? null,
    note: (r.note as string) ?? null,
    unsubscribeToken: String(r.unsubscribe_token ?? ""),
    subscribedOn: dateStr(r.subscribed_on),
    unsubscribedOn: dateStr(r.unsubscribed_on),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toList(r: Row): NurturingList {
  return {
    id: num(r.id),
    name: String(r.name ?? ""),
    description: (r.description as string) ?? null,
    color: (r.color as string) ?? null,
    memberCount: num(r.member_count),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toCampaign(r: Row): Campaign {
  return {
    id: num(r.id),
    name: String(r.name ?? ""),
    subject: (r.subject as string) ?? null,
    preheader: (r.preheader as string) ?? null,
    bodyHtml: (r.body_html as string) ?? null,
    bodyText: (r.body_text as string) ?? null,
    fromName: (r.from_name as string) ?? null,
    fromEmail: (r.from_email as string) ?? null,
    replyTo: (r.reply_to as string) ?? null,
    listId: r.list_id == null ? null : num(r.list_id),
    status: (r.status as Campaign["status"]) ?? "下書き",
    scheduledAt: iso(r.scheduled_at),
    sentStartedAt: iso(r.sent_started_at),
    sentFinishedAt: iso(r.sent_finished_at),
    totalCount: num(r.total_count),
    sentCount: num(r.sent_count),
    deliveredCount: num(r.delivered_count),
    openedCount: num(r.opened_count),
    clickedCount: num(r.clicked_count),
    bouncedCount: num(r.bounced_count),
    unsubscribedCount: num(r.unsubscribed_count),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toRecipient(r: Row): CampaignRecipient {
  return {
    id: num(r.id),
    campaignId: num(r.campaign_id),
    subscriberId: num(r.subscriber_id),
    email: String(r.email ?? ""),
    status: (r.status as CampaignRecipient["status"]) ?? "queued",
    sentAt: iso(r.sent_at),
    firstOpenedAt: iso(r.first_opened_at),
    openCount: num(r.open_count),
    firstClickedAt: iso(r.first_clicked_at),
    clickCount: num(r.click_count),
    providerMessageId: (r.provider_message_id as string) ?? null,
    error: (r.error as string) ?? null,
  };
}

function toAutomation(r: Row): Automation {
  return {
    id: num(r.id),
    name: String(r.name ?? ""),
    trigger: (r.trigger as string) ?? null,
    listId: r.list_id == null ? null : num(r.list_id),
    status: (r.status as Automation["status"]) ?? "停止",
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toStep(r: Row): AutomationStep {
  return {
    id: num(r.id),
    automationId: num(r.automation_id),
    stepOrder: num(r.step_order),
    delayDays: num(r.delay_days),
    subject: (r.subject as string) ?? null,
    bodyHtml: (r.body_html as string) ?? null,
    bodyText: (r.body_text as string) ?? null,
  };
}

// 部分更新の SET 句を組む（渡されたキーだけ更新する）
function buildSet(
  patch: Record<string, unknown>,
  map: Record<string, string>,
): { sets: string[]; vals: unknown[] } {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      vals.push(patch[key]);
      sets.push(`${col} = $${vals.length}`);
    }
  }
  return { sets, vals };
}

function newToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// 購読者
// ---------------------------------------------------------------------------
export async function getSubscribers(): Promise<Subscriber[]> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_subscribers ORDER BY created_at DESC NULLS LAST, id DESC",
  );
  return rows.map(toSubscriber);
}

const SUBSCRIBER_MAP: Record<string, string> = {
  email: "email",
  company: "company",
  name: "name",
  status: "status",
  source: "source",
  leadId: "lead_id",
  industry: "industry",
  prefecture: "prefecture",
  owner: "owner",
  note: "note",
};

export type SubscriberInput = {
  email: string;
  company?: string | null;
  name?: string | null;
  source?: string | null;
  leadId?: number | null;
  industry?: string | null;
  prefecture?: string | null;
  owner?: string | null;
  note?: string | null;
};

/**
 * 購読者を作る。email が既にあれば作らず、空欄を補完して既存を返す。
 * 送客・手動追加・インポートすべてここを通す（重複送信を防ぐ）。
 */
export async function upsertSubscriber(
  input: SubscriberInput,
): Promise<{ subscriber: Subscriber; created: boolean }> {
  const email = (input.email ?? "").trim();
  if (!email) throw new Error("email is required");

  const existing = await pool.query(
    "SELECT * FROM nurturing_subscribers WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );
  if (existing.rows[0]) {
    // 既存。会社名・氏名・担当・業種・都道府県・lead_id が空なら埋める（上書きはしない）
    const { rows } = await pool.query(
      `UPDATE nurturing_subscribers SET
         company    = COALESCE(company, $2),
         name       = COALESCE(name, $3),
         industry   = COALESCE(industry, $4),
         prefecture = COALESCE(prefecture, $5),
         owner      = COALESCE(owner, $6),
         lead_id    = COALESCE(lead_id, $7),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.rows[0].id,
        input.company ?? null,
        input.name ?? null,
        input.industry ?? null,
        input.prefecture ?? null,
        input.owner ?? null,
        input.leadId ?? null,
      ],
    );
    return { subscriber: toSubscriber(rows[0]), created: false };
  }

  const { rows } = await pool.query(
    `INSERT INTO nurturing_subscribers
       (email, company, name, status, source, lead_id, industry, prefecture, owner, note, unsubscribe_token, subscribed_on)
     VALUES ($1,$2,$3,'購読中',$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      email,
      input.company ?? null,
      input.name ?? null,
      input.source ?? "手動追加",
      input.leadId ?? null,
      input.industry ?? null,
      input.prefecture ?? null,
      input.owner ?? null,
      input.note ?? null,
      newToken(),
      todayJst(),
    ],
  );
  return { subscriber: toSubscriber(rows[0]), created: true };
}

export async function updateSubscriber(
  id: number,
  patch: Record<string, unknown>,
): Promise<void> {
  const { sets, vals } = buildSet(patch, SUBSCRIBER_MAP);
  // 配信解除への遷移時は解除日を入れる
  if (patch.status === "配信解除" || patch.status === "停止") {
    sets.push("unsubscribed_on = COALESCE(unsubscribed_on, CURRENT_DATE)");
  }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(
    `UPDATE nurturing_subscribers SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals,
  );
}

export async function deleteSubscriber(id: number): Promise<void> {
  await pool.query("DELETE FROM nurturing_list_members WHERE subscriber_id = $1", [id]);
  await pool.query("DELETE FROM nurturing_subscribers WHERE id = $1", [id]);
}

/** 配信停止トークンから購読者を引く（配信停止ページ用） */
export async function getSubscriberByToken(token: string): Promise<Subscriber | null> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_subscribers WHERE unsubscribe_token = $1 LIMIT 1",
    [token],
  );
  return rows[0] ? toSubscriber(rows[0]) : null;
}

/** トークンで配信停止（公開ページから呼ぶ） */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE nurturing_subscribers
       SET status = '配信解除', unsubscribed_on = CURRENT_DATE, updated_at = NOW()
     WHERE unsubscribe_token = $1`,
    [token],
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// リスト（セグメント）
// ---------------------------------------------------------------------------
export async function getLists(): Promise<NurturingList[]> {
  const { rows } = await pool.query(`
    SELECT l.*, COUNT(m.subscriber_id) AS member_count
    FROM nurturing_lists l
    LEFT JOIN nurturing_list_members m ON m.list_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC NULLS LAST, l.id DESC
  `);
  return rows.map(toList);
}

export async function createList(input: {
  name: string;
  description?: string | null;
  color?: string | null;
}): Promise<NurturingList> {
  const { rows } = await pool.query(
    `INSERT INTO nurturing_lists (name, description, color) VALUES ($1,$2,$3) RETURNING *, 0 AS member_count`,
    [input.name, input.description ?? null, input.color ?? null],
  );
  return toList(rows[0]);
}

const LIST_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  color: "color",
};

export async function updateList(id: number, patch: Record<string, unknown>): Promise<void> {
  const { sets, vals } = buildSet(patch, LIST_MAP);
  if (!sets.length) return;
  vals.push(id);
  await pool.query(
    `UPDATE nurturing_lists SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals,
  );
}

export async function deleteList(id: number): Promise<void> {
  await pool.query("DELETE FROM nurturing_list_members WHERE list_id = $1", [id]);
  await pool.query("DELETE FROM nurturing_lists WHERE id = $1", [id]);
}

export async function addToList(listId: number, subscriberIds: number[]): Promise<void> {
  if (!subscriberIds.length) return;
  const values = subscriberIds.map((_, i) => `($1, $${i + 2})`).join(", ");
  await pool.query(
    `INSERT INTO nurturing_list_members (list_id, subscriber_id) VALUES ${values}
     ON CONFLICT (list_id, subscriber_id) DO NOTHING`,
    [listId, ...subscriberIds],
  );
}

export async function removeFromList(listId: number, subscriberId: number): Promise<void> {
  await pool.query(
    "DELETE FROM nurturing_list_members WHERE list_id = $1 AND subscriber_id = $2",
    [listId, subscriberId],
  );
}

/** リストに属する購読者ID。キャンペーン配信対象の展開に使う */
export async function getListSubscriberIds(listId: number): Promise<number[]> {
  const { rows } = await pool.query(
    "SELECT subscriber_id FROM nurturing_list_members WHERE list_id = $1",
    [listId],
  );
  return rows.map((r) => num(r.subscriber_id));
}

// ---------------------------------------------------------------------------
// キャンペーン（メルマガ）
// ---------------------------------------------------------------------------
export async function getCampaigns(): Promise<Campaign[]> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_campaigns ORDER BY created_at DESC NULLS LAST, id DESC",
  );
  return rows.map(toCampaign);
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const { rows } = await pool.query("SELECT * FROM nurturing_campaigns WHERE id = $1", [id]);
  return rows[0] ? toCampaign(rows[0]) : null;
}

export async function createCampaign(input: {
  name: string;
  subject?: string | null;
  listId?: number | null;
}): Promise<Campaign> {
  const { rows } = await pool.query(
    `INSERT INTO nurturing_campaigns (name, subject, list_id) VALUES ($1,$2,$3) RETURNING *`,
    [input.name, input.subject ?? null, input.listId ?? null],
  );
  return toCampaign(rows[0]);
}

const CAMPAIGN_MAP: Record<string, string> = {
  name: "name",
  subject: "subject",
  preheader: "preheader",
  bodyHtml: "body_html",
  bodyText: "body_text",
  fromName: "from_name",
  fromEmail: "from_email",
  replyTo: "reply_to",
  listId: "list_id",
  status: "status",
  scheduledAt: "scheduled_at",
};

export async function updateCampaign(id: number, patch: Record<string, unknown>): Promise<void> {
  const { sets, vals } = buildSet(patch, CAMPAIGN_MAP);
  if (!sets.length) return;
  vals.push(id);
  await pool.query(
    `UPDATE nurturing_campaigns SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals,
  );
}

export async function deleteCampaign(id: number): Promise<void> {
  await pool.query("DELETE FROM nurturing_campaign_recipients WHERE campaign_id = $1", [id]);
  await pool.query("DELETE FROM nurturing_campaigns WHERE id = $1", [id]);
}

export async function getCampaignRecipients(campaignId: number): Promise<CampaignRecipient[]> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_campaign_recipients WHERE campaign_id = $1 ORDER BY id",
    [campaignId],
  );
  return rows.map(toRecipient);
}

/**
 * 送信対象の購読者を配信明細（queued）に展開する。
 * listId 指定ならそのリスト、null なら全購読者。購読中の者だけ。
 * 既に明細がある購読者は重複させない。展開した件数を返す。
 */
export async function buildRecipients(campaign: Campaign): Promise<number> {
  const params: unknown[] = [campaign.id];
  let where = "s.status = '購読中'";
  if (campaign.listId != null) {
    params.push(campaign.listId);
    where +=
      " AND s.id IN (SELECT subscriber_id FROM nurturing_list_members WHERE list_id = $2)";
  }
  const { rowCount } = await pool.query(
    `INSERT INTO nurturing_campaign_recipients (campaign_id, subscriber_id, email, status)
     SELECT $1, s.id, s.email, 'queued'
     FROM nurturing_subscribers s
     WHERE ${where}
     ON CONFLICT (campaign_id, subscriber_id) DO NOTHING`,
    params,
  );
  await recountCampaign(campaign.id);
  return rowCount ?? 0;
}

/** 明細の状態から集計をキャンペーン行へ反映する */
export async function recountCampaign(campaignId: number): Promise<void> {
  await pool.query(
    `UPDATE nurturing_campaigns c SET
       total_count        = agg.total,
       sent_count         = agg.sent,
       delivered_count    = agg.delivered,
       opened_count       = agg.opened,
       clicked_count      = agg.clicked,
       bounced_count      = agg.bounced,
       unsubscribed_count = agg.unsub,
       updated_at         = NOW()
     FROM (
       SELECT
         COUNT(*)                                             AS total,
         COUNT(*) FILTER (WHERE status <> 'queued' AND status <> 'failed') AS sent,
         COUNT(*) FILTER (WHERE status IN ('delivered','opened','clicked')) AS delivered,
         COUNT(*) FILTER (WHERE first_opened_at IS NOT NULL)  AS opened,
         COUNT(*) FILTER (WHERE first_clicked_at IS NOT NULL) AS clicked,
         COUNT(*) FILTER (WHERE status = 'bounced')           AS bounced,
         COUNT(*) FILTER (WHERE status = 'unsubscribed')      AS unsub
       FROM nurturing_campaign_recipients
       WHERE campaign_id = $1
     ) agg
     WHERE c.id = $1`,
    [campaignId],
  );
}

/** queued の配信明細を取り出す（送信ループ用） */
export async function getQueuedRecipients(campaignId: number): Promise<CampaignRecipient[]> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_campaign_recipients WHERE campaign_id = $1 AND status = 'queued' ORDER BY id",
    [campaignId],
  );
  return rows.map(toRecipient);
}

/** 1通の送信結果を明細へ反映（成功=sent／失敗=failed） */
export async function markRecipientSent(
  id: number,
  result: { ok: boolean; providerMessageId?: string | null; error?: string | null },
): Promise<void> {
  if (result.ok) {
    await pool.query(
      `UPDATE nurturing_campaign_recipients
         SET status = 'sent', sent_at = NOW(), provider_message_id = $2, error = NULL
       WHERE id = $1`,
      [id, result.providerMessageId ?? null],
    );
  } else {
    await pool.query(
      `UPDATE nurturing_campaign_recipients SET status = 'failed', error = $2 WHERE id = $1`,
      [id, result.error ?? "送信失敗"],
    );
  }
}

/** キャンペーンを送信中にする */
export async function markCampaignSending(id: number): Promise<void> {
  await pool.query(
    `UPDATE nurturing_campaigns
       SET status = '送信中', sent_started_at = COALESCE(sent_started_at, NOW()), updated_at = NOW()
     WHERE id = $1`,
    [id],
  );
}

/** キャンペーンを送信済にする */
export async function markCampaignSent(id: number): Promise<void> {
  await pool.query(
    `UPDATE nurturing_campaigns SET status = '送信済', sent_finished_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

/** 開封を記録（トラッキングピクセル）。反映したキャンペーンIDを返す */
export async function markRecipientOpened(recipientId: number): Promise<number | null> {
  const { rows } = await pool.query(
    `UPDATE nurturing_campaign_recipients
       SET open_count = open_count + 1,
           first_opened_at = COALESCE(first_opened_at, NOW()),
           status = CASE WHEN status IN ('clicked','unsubscribed','bounced') THEN status ELSE 'opened' END
     WHERE id = $1
     RETURNING campaign_id`,
    [recipientId],
  );
  if (!rows[0]) return null;
  const campaignId = num(rows[0].campaign_id);
  await recountCampaign(campaignId);
  return campaignId;
}

/** クリックを記録（クリック計測リダイレクト）。反映したキャンペーンIDを返す */
export async function markRecipientClicked(recipientId: number): Promise<number | null> {
  const { rows } = await pool.query(
    `UPDATE nurturing_campaign_recipients
       SET click_count = click_count + 1,
           first_clicked_at = COALESCE(first_clicked_at, NOW()),
           first_opened_at = COALESCE(first_opened_at, NOW()),
           status = CASE WHEN status IN ('unsubscribed','bounced') THEN status ELSE 'clicked' END
     WHERE id = $1
     RETURNING campaign_id`,
    [recipientId],
  );
  if (!rows[0]) return null;
  const campaignId = num(rows[0].campaign_id);
  await recountCampaign(campaignId);
  return campaignId;
}

/**
 * Resend の Webhook イベントを配信明細へ反映する。
 * provider_message_id で受信者を特定し、状態と購読者を更新して再集計する。
 */
export async function applyResendEvent(messageId: string, type: string): Promise<void> {
  if (!messageId) return;
  const { rows } = await pool.query(
    "SELECT id, campaign_id, subscriber_id FROM nurturing_campaign_recipients WHERE provider_message_id = $1 LIMIT 1",
    [messageId],
  );
  if (!rows[0]) return;
  const recId = num(rows[0].id);
  const campaignId = num(rows[0].campaign_id);
  const subId = num(rows[0].subscriber_id);

  if (type === "email.delivered") {
    await pool.query(
      `UPDATE nurturing_campaign_recipients
         SET status = CASE WHEN status IN ('opened','clicked') THEN status ELSE 'delivered' END
       WHERE id = $1`,
      [recId],
    );
  } else if (type === "email.bounced") {
    await pool.query("UPDATE nurturing_campaign_recipients SET status = 'bounced' WHERE id = $1", [recId]);
    await pool.query(
      "UPDATE nurturing_subscribers SET status = 'バウンス', updated_at = NOW() WHERE id = $1",
      [subId],
    );
  } else if (type === "email.complained") {
    await pool.query("UPDATE nurturing_campaign_recipients SET status = 'unsubscribed' WHERE id = $1", [recId]);
    await pool.query(
      "UPDATE nurturing_subscribers SET status = '配信解除', unsubscribed_on = CURRENT_DATE, updated_at = NOW() WHERE id = $1",
      [subId],
    );
  } else {
    return;
  }
  await recountCampaign(campaignId);
}

/** 購読者ID → 配信停止トークン のマップ（送信時の配信停止リンク生成用） */
export async function getUnsubscribeTokenMap(
  subscriberIds: number[],
): Promise<Record<number, string>> {
  if (!subscriberIds.length) return {};
  const { rows } = await pool.query(
    "SELECT id, unsubscribe_token FROM nurturing_subscribers WHERE id = ANY($1)",
    [subscriberIds],
  );
  const map: Record<number, string> = {};
  for (const r of rows) map[num(r.id)] = String(r.unsubscribe_token ?? "");
  return map;
}

// ---------------------------------------------------------------------------
// ダッシュボード集計
// ---------------------------------------------------------------------------
export type NurturingSummary = {
  subscribers: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  lists: number;
  campaigns: number;
  sentCampaigns: number;
};

export async function getSummary(): Promise<NurturingSummary> {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM nurturing_subscribers)                              AS subscribers,
      (SELECT COUNT(*) FROM nurturing_subscribers WHERE status = '購読中')       AS active,
      (SELECT COUNT(*) FROM nurturing_subscribers WHERE status = '配信解除')     AS unsubscribed,
      (SELECT COUNT(*) FROM nurturing_subscribers WHERE status = 'バウンス')     AS bounced,
      (SELECT COUNT(*) FROM nurturing_lists)                                    AS lists,
      (SELECT COUNT(*) FROM nurturing_campaigns)                                AS campaigns,
      (SELECT COUNT(*) FROM nurturing_campaigns WHERE status = '送信済')         AS sent_campaigns
  `);
  const r = rows[0] ?? {};
  return {
    subscribers: num(r.subscribers),
    active: num(r.active),
    unsubscribed: num(r.unsubscribed),
    bounced: num(r.bounced),
    lists: num(r.lists),
    campaigns: num(r.campaigns),
    sentCampaigns: num(r.sent_campaigns),
  };
}

// ---------------------------------------------------------------------------
// シナリオ（ステップメール / automation）
// ---------------------------------------------------------------------------

/** 一覧（ステップ数・進行中の登録数つき） */
export async function getAutomations(): Promise<
  (Automation & { stepCount: number; activeEnrollments: number })[]
> {
  const { rows } = await pool.query(`
    SELECT a.*,
      (SELECT COUNT(*) FROM nurturing_automation_steps s WHERE s.automation_id = a.id) AS step_count,
      (SELECT COUNT(*) FROM nurturing_automation_enrollments e
         WHERE e.automation_id = a.id AND e.status = '進行中') AS active_enrollments
    FROM nurturing_automations a
    ORDER BY a.created_at DESC NULLS LAST, a.id DESC
  `);
  return rows.map((r) => ({
    ...toAutomation(r),
    stepCount: num(r.step_count),
    activeEnrollments: num(r.active_enrollments),
  }));
}

export async function getAutomation(id: number): Promise<Automation | null> {
  const { rows } = await pool.query("SELECT * FROM nurturing_automations WHERE id = $1", [id]);
  return rows[0] ? toAutomation(rows[0]) : null;
}

export async function createAutomation(input: {
  name: string;
  trigger?: string | null;
  listId?: number | null;
}): Promise<Automation> {
  const { rows } = await pool.query(
    `INSERT INTO nurturing_automations (name, trigger, list_id, status)
     VALUES ($1,$2,$3,'停止') RETURNING *`,
    [input.name, input.trigger ?? "購読者追加", input.listId ?? null],
  );
  return toAutomation(rows[0]);
}

const AUTOMATION_MAP: Record<string, string> = {
  name: "name",
  trigger: "trigger",
  listId: "list_id",
  status: "status",
};

export async function updateAutomation(id: number, patch: Record<string, unknown>): Promise<void> {
  const { sets, vals } = buildSet(patch, AUTOMATION_MAP);
  if (!sets.length) return;
  vals.push(id);
  await pool.query(
    `UPDATE nurturing_automations SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals,
  );
}

export async function deleteAutomation(id: number): Promise<void> {
  await pool.query("DELETE FROM nurturing_automation_enrollments WHERE automation_id = $1", [id]);
  await pool.query("DELETE FROM nurturing_automation_steps WHERE automation_id = $1", [id]);
  await pool.query("DELETE FROM nurturing_automations WHERE id = $1", [id]);
}

// ---- ステップ ----

export async function getSteps(automationId: number): Promise<AutomationStep[]> {
  const { rows } = await pool.query(
    "SELECT * FROM nurturing_automation_steps WHERE automation_id = $1 ORDER BY step_order, id",
    [automationId],
  );
  return rows.map(toStep);
}

export async function addStep(
  automationId: number,
  input: { delayDays?: number; subject?: string | null; bodyHtml?: string | null },
): Promise<AutomationStep> {
  const ord = await pool.query(
    "SELECT COALESCE(MAX(step_order),0) + 1 AS n FROM nurturing_automation_steps WHERE automation_id = $1",
    [automationId],
  );
  const stepOrder = num(ord.rows[0].n);
  const { rows } = await pool.query(
    `INSERT INTO nurturing_automation_steps (automation_id, step_order, delay_days, subject, body_html)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [automationId, stepOrder, input.delayDays ?? 0, input.subject ?? null, input.bodyHtml ?? null],
  );
  return toStep(rows[0]);
}

const STEP_MAP: Record<string, string> = {
  delayDays: "delay_days",
  subject: "subject",
  bodyHtml: "body_html",
  bodyText: "body_text",
  stepOrder: "step_order",
};

export async function updateStep(id: number, patch: Record<string, unknown>): Promise<void> {
  const { sets, vals } = buildSet(patch, STEP_MAP);
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE nurturing_automation_steps SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
}

export async function deleteStep(id: number): Promise<void> {
  await pool.query("DELETE FROM nurturing_automation_steps WHERE id = $1", [id]);
}

// ---- 登録（enrollment）と実行 ----

/**
 * 購読者をシナリオに登録する。1ステップ目の delay を待って最初の送信予定を立てる。
 * ステップが無いシナリオには登録しない。重複登録は無視する。
 */
export async function enrollSubscriber(automationId: number, subscriberId: number): Promise<void> {
  const step1 = await pool.query(
    "SELECT delay_days FROM nurturing_automation_steps WHERE automation_id = $1 ORDER BY step_order LIMIT 1",
    [automationId],
  );
  if (!step1.rows[0]) return;
  const delay = num(step1.rows[0].delay_days);
  await pool.query(
    `INSERT INTO nurturing_automation_enrollments
       (automation_id, subscriber_id, current_step, next_run_at, status)
     VALUES ($1, $2, 0, NOW() + ($3 || ' days')::interval, '進行中')
     ON CONFLICT (automation_id, subscriber_id) DO NOTHING`,
    [automationId, subscriberId, delay],
  );
}

/** 新規購読者を「購読者追加」トリガーの有効なシナリオへ登録する */
export async function enrollNewSubscriber(subscriberId: number): Promise<void> {
  const { rows } = await pool.query(
    "SELECT id FROM nurturing_automations WHERE status = '有効' AND trigger = '購読者追加'",
  );
  for (const r of rows) await enrollSubscriber(num(r.id), subscriberId);
}

/** リストに追加された購読者を「リスト追加」トリガーの有効なシナリオへ登録する */
export async function enrollListMembers(listId: number, subscriberIds: number[]): Promise<void> {
  if (!subscriberIds.length) return;
  const { rows } = await pool.query(
    "SELECT id FROM nurturing_automations WHERE status = '有効' AND trigger = 'リスト追加' AND list_id = $1",
    [listId],
  );
  for (const r of rows) {
    for (const sid of subscriberIds) await enrollSubscriber(num(r.id), sid);
  }
}

export type DueEnrollment = {
  enrollmentId: number;
  automationId: number;
  subscriberId: number;
  email: string;
  unsubscribeToken: string;
  currentStep: number;
  step: AutomationStep | null;
};

/** 送信予定が来ている登録を取り出す（購読中・有効シナリオのみ）。次に送るべきステップも同梱 */
export async function getDueEnrollments(limit = 200): Promise<DueEnrollment[]> {
  const { rows } = await pool.query(
    `SELECT e.id AS enrollment_id, e.automation_id, e.subscriber_id, e.current_step,
            s.email, s.unsubscribe_token,
            st.id AS step_id, st.step_order, st.delay_days, st.subject, st.body_html, st.body_text
       FROM nurturing_automation_enrollments e
       JOIN nurturing_subscribers s ON s.id = e.subscriber_id
       JOIN nurturing_automations a ON a.id = e.automation_id
       LEFT JOIN nurturing_automation_steps st
         ON st.automation_id = e.automation_id AND st.step_order = e.current_step + 1
      WHERE e.status = '進行中'
        AND e.next_run_at IS NOT NULL AND e.next_run_at <= NOW()
        AND s.status = '購読中'
        AND a.status = '有効'
      ORDER BY e.next_run_at
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    enrollmentId: num(r.enrollment_id),
    automationId: num(r.automation_id),
    subscriberId: num(r.subscriber_id),
    email: String(r.email ?? ""),
    unsubscribeToken: String(r.unsubscribe_token ?? ""),
    currentStep: num(r.current_step),
    step: r.step_id == null ? null : toStep(r),
  }));
}

/**
 * ステップ送信後に登録を1つ進める。
 * 次のステップがあれば delay を待って次回予定を立て、無ければ完了にする。
 */
export async function advanceEnrollment(enrollmentId: number): Promise<void> {
  const upd = await pool.query(
    "UPDATE nurturing_automation_enrollments SET current_step = current_step + 1 WHERE id = $1 RETURNING automation_id, current_step",
    [enrollmentId],
  );
  if (!upd.rows[0]) return;
  const automationId = num(upd.rows[0].automation_id);
  const currentStep = num(upd.rows[0].current_step);
  const next = await pool.query(
    "SELECT delay_days FROM nurturing_automation_steps WHERE automation_id = $1 AND step_order = $2 LIMIT 1",
    [automationId, currentStep + 1],
  );
  if (next.rows[0]) {
    await pool.query(
      "UPDATE nurturing_automation_enrollments SET next_run_at = NOW() + ($2 || ' days')::interval WHERE id = $1",
      [enrollmentId, num(next.rows[0].delay_days)],
    );
  } else {
    await pool.query(
      "UPDATE nurturing_automation_enrollments SET status = '完了', next_run_at = NULL WHERE id = $1",
      [enrollmentId],
    );
  }
}

/** 送るステップが無くなった登録を完了にする */
export async function completeEnrollment(enrollmentId: number): Promise<void> {
  await pool.query(
    "UPDATE nurturing_automation_enrollments SET status = '完了', next_run_at = NULL WHERE id = $1",
    [enrollmentId],
  );
}
