// メール送信（Resend）。サーバ専用。
//
// RESEND_API_KEY が必要。未設定なら送信せずエラーを返す（画面で案内する）。
// SDK を足さず fetch で叩く（依存を増やさない）。
// 送信元は独自ドメイン認証（SPF/DKIM）済みのアドレスを NURTURING_FROM_EMAIL に入れる。

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendInput = {
  /** "表示名 <address@domain>" 形式 */
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
  /** List-Unsubscribe 等の追加ヘッダ */
  headers?: Record<string, string>;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** 送信基盤が使えるか（未設定なら画面で設定を促す） */
export function hasResend(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** 送信元の既定値。ドメイン認証後に本番アドレスへ差し替える */
export function defaultFrom(name?: string | null, email?: string | null): string {
  const n = (name || "SEEKAD").trim();
  const e = (email || process.env.NURTURING_FROM_EMAIL || "").trim();
  return e ? `${n} <${e}>` : n;
}

/** 1通送る。失敗しても throw せず結果を返す（配信ループを止めないため） */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY 未設定" };
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo || undefined,
        headers: input.headers,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message || `HTTP ${res.status}` };
    return { ok: true, id: data.id || "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
