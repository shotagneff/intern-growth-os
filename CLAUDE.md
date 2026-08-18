# CLAUDE.md

株式会社SEEKAD 社内統合管理システム「シークアドシステム」の開発ルール。
項目は一つずつ決めながら育てる（未定の項目は書かない）。

---

## 1. 前提・運用ルール

- このプロジェクトは **すべて非公開（private）** で運用する（リポジトリ移行時に変更予定）
- 元リポジトリ: `shotagneff/intern-growth-os`（public）からクローン。名称・ブランディングを「シークアドシステム」に変更して開発を続ける
- **方針が変わったとき**: 進捗セクションを上書き → 変更ログに理由を追記
- **ファイル追加・削除時**: ファイル構成セクションのツリーと定義を必ず更新する

---

## 2. プロジェクト概要

- **会社名**: 株式会社SEEKAD
- **プロジェクト名**: シークアドシステム（旧名: intern growth OS）
- **目的**: 給料計算・出席管理・売上換算・研修動画など、社内ツールを一括管理するシステム
- **対象ユーザー**: SEEKAD社員（管理者・一般社員）
- **ブランドカラー**: ゴールド系 `#9e8d70`

---

## 3. 技術スタック

| 項目 | 詳細 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| 言語 | TypeScript 5 |
| DB | PostgreSQL（`pg` ライブラリ、`DATABASE_URL` 環境変数） |
| 認証 | 独自実装（HMAC-SHA256トークン + httpOnly Cookie `igos_session`、scryptハッシュ） |
| AI | Claude API（`@anthropic-ai/sdk`、モデル `claude-opus-5`、`ANTHROPIC_API_KEY` 環境変数） |
| デプロイ | Vercel（`@vercel/postgres` 依存） |
| デザイン | Apple風ミニマル。角丸カード・微細シャドウ・ダークモード対応 |

---

## 4. 機能一覧と現状

### 一般ユーザー向け

| 機能 | パス | 状態 | データ永続化 |
|------|------|------|-------------|
| ホーム（今日のアポ・今日の出勤・お知らせ） | `/` | 実装済み | API（/api/announcements・/api/sales・/api/attendance・/api/members） |
| 日報・ホウレンソウ | `/daily-reports` | 実装済み | **localStorage のみ**（要改善） |
| 反響リード | `/leads` | 実装済み | Callforce 側の Supabase（複製しない） |
| 補助金・助成金 | `/subsidies` | 実装済み | `src/data/subsidies.ts` の台帳（手動更新）+ Claude API |
| 売上・KPIダッシュボード | `/dashboard` | 実装済み | Google スプレッドシートCSV |
| 動画研修ラーニング | `/e-learning` | 実装済み | DB（動画）/ localStorage（視聴履歴） |
| パートナー紹介マインドマップ | `/partners/mindmap` | 実装済み | **localStorage のみ** |
| ランキングボード | `/rankings` | **ダミーデータ** | ハードコード |
| ドキュメント | `/documents` | 実装済み | API |
| 出勤スケジュール | `/attendance` | 実装済み | DB（attendance_weekly / attendance_override）。曜日デフォルト＋日別上書き |
| スレッド | `/threads` | **未実装** | — |

### 管理者向け

| 機能 | パス | 状態 |
|------|------|------|
| ユーザー管理（ID/PW発行・権限設定） | `/admin/users` | 実装済み（DB） |
| メンバー管理 | `/admin/members` | 実装済み（DB） |
| 動画研修管理（CRUD・進捗） | `/admin/e-learning` | 実装済み（DB） |
| お知らせ管理 | `/admin/announcements` | サイドバーのみ |
| イベント管理 | `/admin/events` | サイドバーのみ |
| パートナーマインドマップ管理 | `/admin/partners-mindmap` | サイドバーのみ |
| ドキュメントゾーン管理 | `/docs` | サイドバーのみ |

### 今後追加予定の機能

| 機能 | 概要 |
|------|------|
| 給料計算 | 勤怠データをもとにした給与計算・明細生成 |
| 出席管理 | 出勤・退勤・休暇の記録と集計 |
| 売上換算 | 売上データの集計・レポート・KPI管理の強化 |

### 認証・権限

- **ロール**: `admin`（管理者）/ `user`（一般社員）
- **認証フロー**: DB (`igos_users`) → 環境変数フォールバック → HMAC-SHA256トークン（7日間有効）
- **権限分離**: middleware.ts で `/admin/*` と `/api/admin/*` を admin のみに制限
- **課題**: MobileNav に管理者メニュー未実装

---

## 5. 既知の課題

- **localStorage 依存**: 日報・視聴履歴・パートナーデータがブラウザに閉じており、端末変更で消失する
- **ランキング**: ダミーデータのみ、実データ連携なし
- **MobileNav**: admin 判定ロジック未実装（管理メニュー非表示）
- **リブランディング未着手**: コード内の名称が "intern growth OS" / "インターンダッシュボード" のまま
- **Cookie名**: `igos_session`（旧名のまま）

---

## 6. 進捗（常に最新の状態を反映する）

最終更新: 2026-08-19

### 現在の状態

- `intern-growth-os` リポジトリをクローン完了、CLAUDE.md で全体像を整理
- 反響リード管理（`/leads`）を追加。Callforce の Supabase を直接読む構成
- 補助金・助成金の提案（`/subsidies`）を追加。Claude API の初導入
- リブランディング（名称・Cookie 名）は未着手

### 進め方（マイルストーン）

| フェーズ | 内容 | 状態 |
|---------|------|------|
| 1 | リポジトリクローン・現状把握 | 完了 |
| 2 | リブランディング（名称・UI変更） | 未着手 |
| 3 | 既存機能の改善（localStorage → DB移行等） | 未着手 |
| 4 | 新機能開発（給料計算・出席管理・売上換算） | 未着手 |
| 5 | デプロイ・運用開始 | 未着手 |

---

## 7. 変更ログ（新しいものを上に書く）

### 2026-08-19（全ページをパネル調UIに統一）

- ホーム/反響リード/アポ獲得管理/出勤/日報に続き、残りの全ページ（売上・KPIダッシュボード・成績・動画研修受講ハブ・動画詳細・ドキュメント・ドキュメント管理・お知らせ管理・イベント管理・メンバー管理・ユーザー管理・動画研修管理・パートナー各管理・パートナー紹介マインドマップ・ログイン）を**パネル調UI**（rounded-2xl・白カード・微細シャドウ・ゴールドのアクセント）に統一した
- 共通部品 `src/components/panel.tsx` を新設（`PAGE_MAIN` / `PAGE_INNER` / `PANEL` / `INPUT` / `TEXTAREA` / `PageHeader` / `Panel` / `SectionCard` / `Kpi` / `PrimaryButton` / `MAIN_COLOR`）。各ページはこれを使い、旧 `card-elevated` / `btn-primary` / 濃いゴールド枠を撤去
- アポ獲得管理は「次回アポ日/アポ時刻」の欄を担当者の直後（左寄り）に移動し、ホームの「今日のアポイント」に直結することを明示
- **設計判断: 見た目だけを変え、ロジック・状態・データ取得・API・文言は不変。** 画面を一度に触るとデグレしやすいので、変更を表示層に限定した。作業は独立ファイル単位で並行実施し、最後に tsc とビルドで一括検証
- **既知の問題（今回とは無関係）**: ローカルの `next build`（Turbopack）が、Next.js デフォルトの `/_global-error` 静的プリレンダーで `InvariantError: Expected workUnitAsyncStorage to have a store` を出して落ちる。**今回の変更を退避したクリーンHEADでも同様に再現するため、Next.js/Turbopack 側の既存問題**。tsc・コンパイルは通過し、Vercel の本番デプロイには影響していない（直近の変更もこの状態でデプロイ済み）

### 2026-08-18（ホームをカレンダーから「今日のアポ・今日の出勤」に刷新／出勤スケジュールを追加）

- ホーム（`/`）のカレンダーを撤去し、代わりに **今日のアポイント** と **今日の出勤** を表示するようにした
- **今日のアポイント**: アポ獲得管理（`/api/sales`）のリードのうち「次回アクション日 = 今日」を担当ごとにまとめ、
  誰が何軒・何時に持っているかを時刻順に出す。アポの時刻を持たせるため `sales_leads.next_action_time`（TEXT）を追加し、
  アポ獲得管理の表に「時刻」列を足した
- **今日の出勤 / 出勤スケジュール（`/attendance`）**: 出勤は「曜日ごとに時間を決める」運用なので、
  **曜日デフォルト（attendance_weekly）＋日別上書き（attendance_override）** の2層で持つ。
  設定画面で曜日別の基本出勤時刻と、その日だけの休み・時間変更を入力でき、ホームの「今日の出勤」に反映される
- **設計判断: 出勤ロジックは純粋関数（`attendance-util.ts`）に分け、DBアクセス（`attendance.ts`）と切り離した。**
  ホームはクライアントコンポーネントなので、`pool`（pg）を持ち込むとブラウザ側バンドルに入ってビルドが落ちる。
  `resolveForDate` はサーバ・クライアント双方から呼べる形にしてある
- **設計判断: アポの元データはアポ獲得管理を再利用（二重管理しない）。** 別テーブルに手入力させると、
  結局スプレッドシート時代の二重管理に戻る。既存のリードに時刻列を1本足すだけにした

### 2026-08-13（受付状況の自動確認と、台帳の鮮度警告を追加）

- 提案した上位3件について、公式ページを `web_fetch` で取得し「今も受付中か」を確認する
  `/api/subsidies/verify` を追加。結果は画面にバッジで出す
- **なぜ必要か: 台帳の締切日だけでは足りない。** 補助金は予算上限に達すると期日前でも
  打ち切られる。調査時点で北海道と愛媛が、公募要領の日付上はまだ募集中に見えて
  実際は止まっていた。営業がその状態で架電すると現場で恥をかく
- **設計判断: 検証は提案とは別リクエストにする。** 提案の生成に検証を挟むと
  最初の結果が10〜20秒遅くなる。画面には先に提案を出し、検証結果は後から足す。
  検証が落ちても提案は残る（バッジが出ないだけ）
- **設計判断: 検索させるのは「受付中か」だけ。** 答えの決まっている質問の検証なら
  検索は信頼できるが、「まだ知らない制度を見つける」のは最も苦手。
  制度の発見は台帳（人が更新）に任せたまま
- 台帳が60日を超えて古い場合、画面上部に警告を出す（`ledgerFreshness()`）。
  古い台帳を黙って使い続けて締切切れの制度を案内するのが一番危ないため

### 2026-08-13（補助金・助成金の提案を追加）

- `/subsidies` を追加。営業が架電前に相手企業の情報を入れると、その会社が今使える
  補助金・助成金と、そのまま読み上げられる切り出しが出る
- **設計判断: 制度の絞り込みは台帳、提案の組み立てだけを AI に任せる。**
  全部 AI に投げると存在しない制度を作ったり締切を取り違えたりするため、
  事実（都道府県・締切・金額・要件）は `src/data/subsidies.ts` に持ち、
  AI には絞り込み済みの候補だけを渡す。返ってきた id が候補外なら API 側で除外する
- **設計判断: 台帳は手動更新。** 補助金は年度途中の補正で増え、名称も毎年変わる。
  毎回 Web 検索させると取りこぼすため、人が確認した内容を持ち、
  `LEDGER_UPDATED_AT` を UI に出して鮮度を伝える
- Claude API（`@anthropic-ai/sdk`）を初導入。モデルは `claude-opus-5`、
  出力は structured outputs で固定。システムプロンプトは毎回同じなのでキャッシュする
- `ANTHROPIC_API_KEY` が新たに必要。未設定なら API は 503 を返す

### 2026-04-20（プロジェクト開始）

- `intern-growth-os` をクローンし「シークアドシステム」として開発開始
- 既存コードの全体像を調査・整理
- CLAUDE.md 初版作成

---

## 8. ファイル構成（常に最新を維持）

```
シークアドシステム/
├── CLAUDE.md                          本ファイル。プロジェクト全体のルール・進捗・変更ログ。
├── package.json                       依存管理。Next.js 16 / React 19 / pg / Tailwind v4。
├── middleware.ts                      認証ミドルウェア。全ページで Cookie 検証、admin 権限チェック。
├── next.config.ts                     Next.js 設定（現状デフォルト）。
├── tsconfig.json                      TypeScript 設定。
├── eslint.config.mjs                  ESLint 設定。
├── postcss.config.mjs                 PostCSS 設定（Tailwind）。
│
├── public/                            静的アセット（ブラウザから直接アクセスできるファイル）。
│   └── images/                        画像ファイルをカテゴリ別に整理。
│       ├── logo/
│       │   └── logoseekad.png         SEEKAD ロゴ。
│       ├── avatars/                   メンバーアバター画像（一元管理）。
│       │   ├── avatar_hiraga.jpg
│       │   ├── avatar_sato.png
│       │   ├── avatar_seekad.jpeg
│       │   └── avatar_takuma.jpg
│       ├── icons/                     ナビゲーション・ページヘッダー用アイコン。
│       │   ├── homeicon.png
│       │   ├── daily-icon.svg
│       │   ├── elearning-icon.png
│       │   ├── ranking-icon.png
│       │   ├── mindmap-icon.png
│       │   └── sales-dashboard.png
│       ├── banners/                   バナー・背景画像。
│       │   └── training-banners/      研修バナー画像。
│       └── docs/
│           └── Document.png           ドキュメント用画像。
│
└── src/                               アプリ本体のソースコード。
    ├── app/
    │   ├── layout.tsx                 ルートレイアウト。フォント・メタデータ設定。
    │   ├── AppShell.tsx               共通シェル。ログイン以外で Sidebar/MobileNav を表示。
    │   ├── Sidebar.tsx                デスクトップ用サイドバー。admin 判定でメニュー出し分け。
    │   ├── MobileNav.tsx              モバイル用ハンバーガーナビ。
    │   ├── globals.css                グローバルCSS。
    │   │
    │   │  ── 機能別 Route Groups（括弧付き = URLに影響しない）──
    │   │
    │   ├── (auth)/                    認証
    │   │   └── login/page.tsx             → /login
    │   │
    │   ├── (home)/                    ホーム画面
    │   │   └── page.tsx                   → /
    │   │
    │   ├── (daily)/                   日報
    │   │   └── daily-reports/page.tsx     → /daily-reports
    │   │
    │   ├── (sales)/                   売上・KPI・ランキング
    │   │   ├── dashboard/page.tsx         → /dashboard
    │   │   └── rankings/page.tsx          → /rankings
    │   │
    │   ├── (learning)/                動画研修・ラーニング
    │   │   ├── e-learning/page.tsx        → /e-learning
    │   │   ├── learning/page.tsx          → /learning
    │   │   └── videos/[id]/page.tsx       → /videos/[id]
    │   │
    │   ├── (partners)/                パートナー関連
    │   │   └── partners/mindmap/page.tsx  → /partners/mindmap
    │   │
    │   ├── (documents)/               ドキュメント
    │   │   ├── documents/page.tsx         → /documents
    │   │   └── docs/page.tsx              → /docs
    │   │
    │   │  ── Route Group なし（そのまま URL になる）──
    │   │
    │   ├── attendance/               出勤スケジュール（→ /attendance）。曜日ごとの基本出勤時刻＋日別の休み・時間変更を設定。
    │   │   └── page.tsx
    │   │
    │   ├── leads/                     反響リード（→ /leads）。
    │   │   ├── page.tsx               ダッシュボード／一覧のタブ切り替え。
    │   │   ├── Dashboard.tsx          反響の集計・分析パネル。
    │   │   ├── LeadList.tsx           一覧と対応状況・担当の更新。
    │   │   └── ui.tsx                 Card / Panel / Kpi。他画面からも再利用する。
    │   │
    │   ├── subsidies/                 補助金・助成金の提案（→ /subsidies）。
    │   │   ├── page.tsx               ページ枠。
    │   │   └── SubsidyFinder.tsx      入力フォームと提案結果の表示。
    │   │
    │   │  ── 管理者・API（グルーピング不要、そのまま）──
    │   │
    │   ├── admin/                     管理者向けページ群。
    │   │   ├── users/                 ユーザー管理。
    │   │   ├── members/               メンバー管理。
    │   │   ├── e-learning/            動画研修管理・進捗閲覧。
    │   │   ├── announcements/         お知らせ管理。
    │   │   ├── events/                イベント管理。
    │   │   ├── partners/              パートナー管理。
    │   │   └── partners-mindmap/      マインドマップ管理。
    │   │
    │   └── api/                       API エンドポイント群。
    │       ├── auth/                  認証（login / logout / me）。
    │       ├── e-learning/            動画CRUD・進捗管理。
    │       ├── documents/             ドキュメント取得。
    │       ├── members/               メンバー取得。
    │       ├── attendance/            出勤スケジュール取得・保存（weekly / override）。
    │       ├── sales/                 アポ獲得管理（リード・案件・顧客）の取得・更新。
    │       ├── events/                イベント取得。
    │       ├── announcements/         お知らせ取得。
    │       ├── threads/               スレッド投稿・予約投稿。
    │       ├── users/                 ユーザー取得。
    │       ├── home/                  ホーム用カレンダーイベント。
    │       ├── leads/                 反響リードの取得・更新（Callforce の Supabase を直接読む）。
    │       ├── subsidies/             補助金の提案。台帳で絞り込み → Claude API で提案文を生成。
    │       │   └── verify/            提案した制度が今も受付中かを公式ページで確認（web_fetch）。
    │       │                          提案とは別リクエスト。検証で待たせず、失敗しても提案は残す。
    │       └── admin/                 管理者用API（members / users / e-learning / announcements / events）。
    │
    ├── components/                    画面共通のUI部品。
    │   ├── panel.tsx                  パネル調UIの共通部品（ページ枠/カード/入力/KPI/ボタン）。全ページで使う。
    │   └── table-ui.tsx               表まわりの共通部品（TableFrame / TD / TH / ToneSelect 等）。
    │
    ├── lib/                           共通ロジック。
    │   ├── auth-token.ts              セッショントークンの生成・検証。
    │   ├── password.ts                パスワードのハッシュ化・照合。
    │   ├── db.ts                      PostgreSQL の接続プール（`DATABASE_URL`）。
    │   ├── schema.ts                  DB スキーマ定義。
    │   ├── callforce.ts               Callforce（AI架電）の反響リード取得・集計。
    │   ├── attendance-util.ts         出勤の純粋ロジック（曜日→出勤者の確定 resolveForDate 等）。ブラウザ・サーバ共用。
    │   ├── attendance.ts              出勤スケジュールのDBアクセス（weekly / override の取得・保存）。サーバ専用。
    │   └── subsidies.ts               補助金の絞り込みと業務改善助成金の助成額試算。
    │
    └── data/
        ├── videos.ts                  動画データ型定義・初期データ（videos/[id] で使用）。
        └── subsidies.ts               補助金・助成金の台帳。**手動更新**。締切が過ぎても消さず
                                       status を closed にする（来期の先回りリストとして使うため）。
```

> **運用ルール**: ファイルやフォルダを追加・削除したら、このツリーと定義も必ず更新する。
