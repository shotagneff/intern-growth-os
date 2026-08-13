import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { LEDGER_UPDATED_AT, PREFECTURES, type Prefecture, type Industry } from "@/data/subsidies";
import {
  findCandidates,
  toPromptPayload,
  estimateGyomuKaizen,
  type CompanyProfile,
} from "@/lib/subsidies";

// 補助金・助成金の提案を返す。
//
// 制度の絞り込みは台帳（src/data/subsidies.ts）で機械的に行い、AI には
// 「絞り込んだ候補をこの会社にどう提案するか」だけを考えさせる。
// 全部 AI に任せると存在しない制度を作る・締切を取り違えるので、
// 事実は台帳、判断は AI という分担にしている。
//
// 必要な環境変数:
//   ANTHROPIC_API_KEY

export const dynamic = "force-dynamic";

/** モデルは Claude Opus 5。effort は速度優先で medium（営業が架電前に叩くので待たせない） */
const MODEL = "claude-opus-5";
const EFFORT = "medium";

function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** AI に返させる形。id は必ず候補の中から選ばせる */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "この会社への打ち手を2〜3文で。最優先の制度と、その理由。",
    },
    recommendations: {
      type: "array",
      description: "提案する制度。優先度の高い順に最大5件。",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "候補リストの id をそのまま。新しい id を作らない" },
          priority: { type: "string", enum: ["A", "B", "C"], description: "A=今すぐ動く B=次点 C=参考" },
          headline: { type: "string", description: "この制度をひと言で。金額と締切が分かる形で" },
          why: { type: "string", description: "なぜこの会社に合うのか。入力された情報に紐づけて具体的に" },
          talkScript: { type: "string", description: "架電の切り出し。実際に読み上げられる話し言葉で2〜3文" },
          cautions: {
            type: "array",
            items: { type: "string" },
            description: "先に潰すべき要件・落とし穴。候補データの gotchas から関係するものを選ぶ",
          },
          nextAction: { type: "string", description: "この案件で次にやること。1文" },
        },
        required: ["id", "priority", "headline", "why", "talkScript", "cautions", "nextAction"],
        additionalProperties: false,
      },
    },
    notes: {
      type: "array",
      items: { type: "string" },
      description: "全体への申し送り。確認が必要なこと、聞き出せていない情報など",
    },
  },
  required: ["summary", "recommendations", "notes"],
  additionalProperties: false,
} as const;

/** 制度の性質と、営業として外してはいけない前提。台帳と同じ内容なので毎回変わらない＝キャッシュが効く */
const SYSTEM_PROMPT = `あなたは株式会社SEEKADの補助金アドバイザーです。営業メンバーが架電する直前に使う社内ツールとして、渡された候補制度の中からこの会社に提案すべきものを選び、そのまま話せる形で返します。

## 前提

SEEKADが売っているのは業務効率化を目的としたシステム開発・DX支援です。次の2つの制約があります。

1. フルスクラッチの受託開発が中心。SaaSやパッケージの再販ではありません。
2. 国の「デジタル化・AI導入補助金」のIT導入支援事業者登録をしていません。登録が前提の制度は使えません。

候補リストは既にこの2条件でフィルタ済みです。リストにない制度を持ち出さないでください。

## 守ること

- **候補リストにある制度だけを提案する。** id は渡されたものをそのまま使い、新しい制度を作らない。
- **金額・締切・補助率は候補データの値をそのまま使う。** 計算し直したり丸めたりしない。
- **補助金と助成金の違いを踏まえる。** 補助金は審査で落ちることがある。助成金（厚労省系）は要件を満たせば原則支給される。助成金を提案するときはその確実性が武器になる。
- **「最大◯◯万円」は条件付きであることが多い。** 上限額の注記（amountNote）がある制度では、talkScript で上限を言い切らない。
- **交付決定前の発注は対象外。** これは全制度に近い共通ルール。商談が進みそうなときほど、この順序を守るよう案内する。
- 入力に不足がある場合は notes に「何を聞き出すべきか」を書く。推測で埋めない。

## トーンの指定

talkScript は実際に電話で読み上げる文章です。書き言葉ではなく話し言葉で、2〜3文。制度名と締切を最初に出して、相手が「それは何の話か」を即座に理解できるようにしてください。誇張しない。「必ずもらえます」とは書かない。

why と cautions は営業メンバーが読む社内向けの文章です。要点だけを簡潔に。`;

type RequestBody = CompanyProfile & {
  /** 業務改善助成金の試算に使う。コースと引き上げ人数 */
  gyomuKaizenCourse?: 50 | 70 | 90;
  raisedWorkers?: number;
};

export async function POST(req: NextRequest) {
  if (!hasAnthropic()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が未設定です" },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;

  if (!body?.prefecture) {
    return NextResponse.json({ error: "都道府県が必要です" }, { status: 400 });
  }
  if (!PREFECTURES.includes(body.prefecture as Prefecture)) {
    return NextResponse.json({ error: "都道府県の値が不正です" }, { status: 400 });
  }

  const profile: CompanyProfile = {
    prefecture: body.prefecture as Prefecture,
    industry: body.industry as Industry | undefined,
    employees: body.employees,
    hourlyWage: body.hourlyWage,
    willRaiseWage: body.willRaiseWage,
    budget: body.budget,
    issue: body.issue,
  };

  // 1. 台帳から機械的に絞り込む
  const candidates = findCandidates(profile);

  if (candidates.length === 0) {
    return NextResponse.json({
      ledgerUpdatedAt: LEDGER_UPDATED_AT,
      candidateCount: 0,
      result: {
        summary: `${profile.prefecture}で今すぐ使える制度は、台帳の中には見つかりませんでした。`,
        recommendations: [],
        notes: [
          "都道府県の制度は4〜6月公募・夏には終了というサイクルが多いため、時期によっては候補が出ません。",
          "国の中小企業省力化投資補助金や、業種特化の制度（介護・医療）を当たってください。",
          "市区町村の制度は台帳に入っていません。政令市・中核市は別途確認が必要です。",
        ],
      },
      estimate: null,
    });
  }

  // 2. 業務改善助成金が候補にあるなら助成額を試算しておく。営業が暗算で間違えるのを防ぐ
  const hasGyomuKaizen = candidates.some((c) => c.subsidy.id === "mhlw-gyomu-kaizen");
  const estimate =
    hasGyomuKaizen && body.gyomuKaizenCourse && body.raisedWorkers
      ? estimateGyomuKaizen(body.gyomuKaizenCourse, body.raisedWorkers, {
          hourlyWage: profile.hourlyWage,
          employees: profile.employees,
          budget: profile.budget,
        })
      : null;

  // 3. AI に提案を作らせる
  const client = new Anthropic();

  const userPrompt = [
    "## 相手企業",
    `所在地: ${profile.prefecture}`,
    profile.industry ? `業種: ${profile.industry}` : "業種: 未確認",
    profile.employees !== undefined ? `従業員数: ${profile.employees}名` : "従業員数: 未確認",
    profile.hourlyWage !== undefined
      ? `事業場内最低賃金: ${profile.hourlyWage}円`
      : "事業場内最低賃金: 未確認",
    profile.willRaiseWage === true
      ? "賃上げ: 前向き"
      : profile.willRaiseWage === false
        ? "賃上げ: 予定なし"
        : "賃上げ意向: 未確認",
    profile.budget !== undefined
      ? `想定投資額: ${profile.budget.toLocaleString()}円`
      : "想定投資額: 未確認",
    profile.issue ? `聞き出した課題: ${profile.issue}` : "課題: 未確認",
    "",
    "## 候補制度",
    "台帳から機械的に絞り込んだものです。この中から選んでください。",
    "```json",
    JSON.stringify(toPromptPayload(candidates), null, 2),
    "```",
    estimate
      ? [
          "",
          "## 業務改善助成金の試算",
          `${estimate.course}円コース / 助成率 ${estimate.rateLabel} / 上限 ${estimate.limit.toLocaleString()}円`,
          estimate.estimated !== null
            ? `想定投資額から計算した支給見込み: ${estimate.estimated.toLocaleString()}円`
            : "想定投資額が未入力のため支給見込みは未算出",
          ...estimate.notes.map((n) => `注記: ${n}`),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // システムプロンプトは毎回同じなのでキャッシュする
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: EFFORT,
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: userPrompt }],
    });

    // 安全側の分類で断られることがある。content を読む前に必ず確認する
    if (response.stop_reason === "refusal") {
      console.error("[subsidies] AI が応答を拒否:", response.stop_details);
      return NextResponse.json(
        { error: "AI が応答を拒否しました。入力内容を確認してください" },
        { status: 502 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI の応答が空でした" }, { status: 502 });
    }

    const result = JSON.parse(textBlock.text) as {
      summary: string;
      recommendations: { id: string }[];
      notes: string[];
    };

    // AI が候補外の id を返していないか検算する。台帳にない制度を営業に見せない
    const validIds = new Set(candidates.map((c) => c.subsidy.id));
    const unknown = result.recommendations.filter((r) => !validIds.has(r.id));
    if (unknown.length > 0) {
      console.warn("[subsidies] 候補外のIDが混ざっていたため除外:", unknown.map((r) => r.id));
      result.recommendations = result.recommendations.filter((r) => validIds.has(r.id));
    }

    return NextResponse.json({
      ledgerUpdatedAt: LEDGER_UPDATED_AT,
      candidateCount: candidates.length,
      result,
      estimate,
      // 台帳側の生データも返す。UI が締切や公式URLを出せるように
      candidates: candidates.map((c) => ({
        id: c.subsidy.id,
        name: c.subsidy.name,
        authority: c.subsidy.authority,
        category: c.subsidy.category,
        url: c.subsidy.url,
        deadline: c.subsidy.deadline,
        opensAt: c.subsidy.opensAt,
        deadlineNote: c.subsidy.deadlineNote,
        rate: c.subsidy.rate,
        maxAmount: c.subsidy.maxAmount,
        amountNote: c.subsidy.amountNote,
        daysLeft: c.daysLeft,
        urgency: c.urgency,
        fit: c.subsidy.fit,
      })),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      console.error("[subsidies] レート制限:", e.message);
      return NextResponse.json(
        { error: "AI が混み合っています。少し待って再実行してください" },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("[subsidies] 認証エラー:", e.message);
      return NextResponse.json({ error: "ANTHROPIC_API_KEY が不正です" }, { status: 503 });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[subsidies] APIエラー:", e.status, e.message);
      return NextResponse.json({ error: `AI の呼び出しに失敗しました (${e.status})` }, { status: 502 });
    }
    console.error("[subsidies] 想定外のエラー:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
