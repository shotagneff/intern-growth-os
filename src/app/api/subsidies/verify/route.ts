import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { findSubsidy } from "@/data/subsidies";

// 提案した制度が「今も受付中か」を公式ページで確認する。
//
// 台帳の締切日だけでは足りない。補助金は予算上限に達すると期日前でも
// 打ち切られる。今回の調査では北海道と愛媛が、公募要領の日付上はまだ
// 募集中に見えて実際は止まっていた。営業がその状態で架電すると現場で恥をかく。
//
// 提案の生成（../route.ts）とは別リクエストにしてある。検証を挟むと
// 最初の結果が10〜20秒遅くなるため、画面には先に提案を出し、
// 検証結果は後からバッジで足す。検証が落ちても提案は残る。
//
// 「この制度は今も受付中か」は答えの決まっている質問なので検索が効く。
// 逆に「まだ知らない制度を見つける」のは検索が最も苦手なので、
// 制度の発見は台帳（人が更新する）に任せている。

export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

/** 1リクエストで確認する上限。増やすほど時間と金がかかる */
const MAX_TARGETS = 3;

/** サーバー側ツールのループが上限に達したとき（pause_turn）の再開回数 */
const MAX_CONTINUATIONS = 3;

function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["open", "closed", "unknown"],
      description:
        "open=今も申請を受け付けている / closed=終了・停止している / unknown=ページから判断できない",
    },
    evidence: {
      type: "string",
      description:
        "そう判断した根拠。ページ上の実際の記載を短く引用する。推測で書かない。",
    },
    deadlineOnPage: {
      type: "string",
      description: "ページに書かれている締切。読み取れなければ空文字",
    },
  },
  required: ["status", "evidence", "deadlineOnPage"],
  additionalProperties: false,
} as const;

type VerifyResult = {
  id: string;
  status: "open" | "closed" | "unknown";
  evidence: string;
  deadlineOnPage: string;
};

/** 制度を1件だけ確認する。並列で叩くので1件あたりを軽くしてある */
async function verifyOne(
  client: Anthropic,
  id: string,
  today: string
): Promise<VerifyResult> {
  const subsidy = findSubsidy(id);
  if (!subsidy) {
    return { id, status: "unknown", evidence: "台帳にない制度です", deadlineOnPage: "" };
  }

  const prompt = `次の補助金が、今日（${today}）時点でまだ申請を受け付けているか、公式ページを見て判断してください。

制度名: ${subsidy.name}
実施主体: ${subsidy.authority}
公式ページ: ${subsidy.url}
台帳上の締切: ${subsidy.deadline ?? "記載なし"}
${subsidy.deadlineNote ? `台帳上の注記: ${subsidy.deadlineNote}` : ""}

まず公式ページを取得してください。

判断のしかた:
- 「受付終了」「募集を終了しました」「予算上限に達したため」といった記載があれば closed。
- 締切日が今日より前なら closed。
- 受付中と明記されているか、締切日が今日以降なら open。
- ページが取得できない、記載が見つからない、別年度の情報しかない場合は unknown。推測で open と答えないでください。

補助金は締切日前でも予算上限で打ち切られます。日付だけを見て open と判断せず、停止の告知がないかを必ず確認してください。

evidence にはページ上の実際の記載を引用してください。ページに書かれていないことを書かないでください。`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: VERIFY_SCHEMA },
      },
      tools: [
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3 },
        { type: "web_search_20260209", name: "web_search", max_uses: 2 },
      ],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return { id, status: "unknown", evidence: "確認できませんでした", deadlineOnPage: "" };
    }

    // サーバー側ツールのループが上限に達した。会話を積んで再開させる
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { id, status: "unknown", evidence: "応答が空でした", deadlineOnPage: "" };
    }

    const parsed = JSON.parse(textBlock.text) as Omit<VerifyResult, "id">;
    return { id, ...parsed };
  }

  return { id, status: "unknown", evidence: "確認が時間内に終わりませんでした", deadlineOnPage: "" };
}

export async function POST(req: NextRequest) {
  if (!hasAnthropic()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が未設定です" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids が必要です" }, { status: 400 });
  }

  const targets = ids.slice(0, MAX_TARGETS);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  const client = new Anthropic();

  // 1件ずつ並列で確認する。まとめて1回のリクエストにすると、
  // 途中で1件失敗しただけで全部落ちるため。
  const settled = await Promise.allSettled(
    targets.map((id) => verifyOne(client, id, today))
  );

  const results: VerifyResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          id: targets[i],
          status: "unknown" as const,
          evidence: "確認に失敗しました",
          deadlineOnPage: "",
        }
  );

  const failures = settled.filter((s) => s.status === "rejected");
  if (failures.length > 0) {
    console.error("[subsidies/verify] 一部の確認に失敗:", failures.length, "件");
  }

  return NextResponse.json({ checkedAt: today, results });
}
