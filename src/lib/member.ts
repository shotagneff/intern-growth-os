// 社員1人分の表示情報（名簿としての形）。DBに触れないのでクライアントからも読める。
//
// 実体は igos_users テーブル。2026-09-02 に members テーブルを廃止して統合した。
// 以前はこの型が管理画面のページファイル（admin/members/page.tsx）に置かれており、
// 画面を消すと型まで消える状態だったので、ここへ移した。

export type Member = {
  /** igos_users.login_id */
  id: string;
  /** 表示名 */
  name: string;
  /** 所属チーム（営業 など） */
  team?: string | null;
  /**
   * 役割＝職種（長期インターン など）。
   * **権限（admin / lead_access / user）ではない。** 権限は src/lib/roles.ts。
   */
  role?: string | null;
  /** アイコン画像のパス（/images/avatars/avatar_hiraga.jpg など） */
  iconUrl?: string | null;
  active: boolean;
  updatedAt?: string;
};
