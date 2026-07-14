# AGENTS.md

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
| デプロイ | Vercel（`@vercel/postgres` 依存） |
| デザイン | Apple風ミニマル。角丸カード・微細シャドウ・ダークモード対応 |

---

## 4. 機能一覧と現状

### 一般ユーザー向け

| 機能 | パス | 状態 | データ永続化 |
|------|------|------|-------------|
| ホーム（カレンダー・お知らせ） | `/` | 実装済み | API + Google スプレッドシート |
| 日報・ホウレンソウ | `/daily-reports` | 実装済み | **localStorage のみ**（要改善） |
| 売上・KPIダッシュボード | `/dashboard` | 実装済み | Google スプレッドシートCSV |
| 動画研修ラーニング | `/e-learning` | 実装済み | DB（動画）/ localStorage（視聴履歴） |
| パートナー紹介マインドマップ | `/partners/mindmap` | 実装済み | **localStorage のみ** |
| ランキングボード | `/rankings` | **ダミーデータ** | ハードコード |
| ドキュメント | `/documents` | 実装済み | API |
| 出退勤 | `/attendance` | **未実装** | — |
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

最終更新: 2026-04-20

### 現在の状態

- `intern-growth-os` リポジトリをクローン完了
- AGENTS.md を作成し、既存コードの全体像を整理
- リブランディング・新機能追加はこれから着手

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

### 2026-04-20（プロジェクト開始）

- `intern-growth-os` をクローンし「シークアドシステム」として開発開始
- 既存コードの全体像を調査・整理
- AGENTS.md 初版作成

---

## 8. ファイル構成（常に最新を維持）

```
シークアドシステム/
├── AGENTS.md                          本ファイル。プロジェクト全体のルール・進捗・変更ログ。
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
    │       ├── events/                イベント取得。
    │       ├── announcements/         お知らせ取得。
    │       ├── threads/               スレッド投稿・予約投稿。
    │       ├── users/                 ユーザー取得。
    │       ├── home/                  ホーム用カレンダーイベント。
    │       └── admin/                 管理者用API（members / users / e-learning / announcements / events）。
    │
    ├── lib/                           共通ロジック。
    │   ├── auth-token.ts              セッショントークンの生成・検証。
    │   └── password.ts                パスワードのハッシュ化・照合。
    │
    └── data/
        └── videos.ts                  動画データ型定義・初期データ（videos/[id] で使用）。
```

> **運用ルール**: ファイルやフォルダを追加・削除したら、このツリーと定義も必ず更新する。
