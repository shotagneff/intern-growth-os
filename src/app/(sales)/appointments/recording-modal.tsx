"use client";

// アポ獲得管理リードの商談録音（1回目/2回目/3回目）を管理するモーダル。
// 録音本体は Vercel Blob へクライアントアップロード（大きい録音でも上げられる）、
// 完了後に URL とメタ情報を /api/sales/recording へ登録する。
import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

type Recording = {
  leadId: number;
  slot: number;
  url: string;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
};

const SLOTS = [1, 2, 3];
const SLOT_LABEL: Record<number, string> = { 1: "1回目", 2: "2回目", 3: "3回目" };

function fmtSize(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function RecordingModal({
  leadId,
  company,
  onClose,
}: {
  leadId: number;
  company: string | null;
  onClose: () => void;
}) {
  const [recs, setRecs] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/recording?leadId=${leadId}`, { cache: "no-store" });
      const data = (await res.json()) as { recordings?: Recording[] };
      setRecs(Array.isArray(data.recordings) ? data.recordings : []);
    } catch {
      setRecs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const bySlot = (s: number) => recs.find((r) => r.slot === s);

  const doUpload = async (slot: number, file: File) => {
    setErr(null);
    setBusy(slot);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "dat";
      const blob = await upload(`sales-recordings/${leadId}/slot${slot}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/sales/recording/upload",
      });
      const res = await fetch("/api/sales/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          slot,
          url: blob.url,
          pathname: blob.pathname,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "登録に失敗しました");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };

  const doDelete = async (slot: number) => {
    if (!confirm(`${SLOT_LABEL[slot]}の録音を削除しますか？`)) return;
    setErr(null);
    setBusy(slot);
    try {
      await fetch("/api/sales/recording", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, slot }),
      });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">商談録音</h2>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{company || "（会社名未設定）"}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            ✕
          </button>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {err}
          </p>
        )}

        <div className="mt-3 space-y-3">
          {SLOTS.map((s) => {
            const rec = bySlot(s);
            const isBusy = busy === s;
            return (
              <div key={s} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{SLOT_LABEL[s]}</span>
                  {rec && (
                    <button
                      disabled={isBusy}
                      onClick={() => doDelete(s)}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      削除
                    </button>
                  )}
                </div>

                {rec ? (
                  <div className="mt-2 space-y-1.5">
                    <audio controls src={rec.url} className="w-full" />
                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
                      <span className="truncate">
                        {rec.filename}
                        {rec.sizeBytes ? ` ・ ${fmtSize(rec.sizeBytes)}` : ""}
                      </span>
                      <label className="shrink-0 cursor-pointer font-semibold text-[#9e8d70] hover:underline">
                        {isBusy ? "処理中…" : "差し替え"}
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          className="hidden"
                          disabled={isBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) doUpload(s, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 py-3 text-xs text-neutral-500 hover:border-[#9e8d70] hover:text-[#9e8d70] dark:border-neutral-700">
                      {isBusy ? "アップロード中…" : "＋ 録音ファイルを選択してアップロード"}
                      <input
                        type="file"
                        accept="audio/*,video/*"
                        className="hidden"
                        disabled={isBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) doUpload(s, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && <p className="mt-2 text-center text-xs text-neutral-400">読み込み中…</p>}
      </div>
    </div>
  );
}
