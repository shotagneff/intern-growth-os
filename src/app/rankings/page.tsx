"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const MAIN_COLOR = "#9e8d70";

type PersonRankingItem = {
  name: string;
  team?: string;
  value: number;
};

type PartnerRankingItem = {
  name: string;
  value: number;
};

const dummyPersonRankings = {
  membersCount: [
    { name: "佐藤 翔永", team: "Biz", value: 32 },
    { name: "平賀 匡", team: "Biz", value: 28 },
    { name: "金岡 伶皇", team: "Biz", value: 24 },
    { name: "Aさん", team: "Intern", value: 18 },
    { name: "Bさん", team: "Intern", value: 15 },
    { name: "Cさん", team: "Intern", value: 12 },
    { name: "Dさん", team: "Intern", value: 10 },
  ] as PersonRankingItem[],
  eventCount: [
    { name: "平賀 匡", team: "Biz", value: 21 },
    { name: "佐藤 翔永", team: "Biz", value: 19 },
    { name: "金岡 伶皇", team: "Biz", value: 17 },
    { name: "Aさん", team: "Intern", value: 11 },
    { name: "Bさん", team: "Intern", value: 9 },
    { name: "Cさん", team: "Intern", value: 7 },
    { name: "Dさん", team: "Intern", value: 5 },
  ] as PersonRankingItem[],
  totalSales: [
    { name: "佐藤 翔永", team: "Biz", value: 780000 },
    { name: "平賀 匡", team: "Biz", value: 720000 },
    { name: "金岡 伶皇", team: "Biz", value: 640000 },
    { name: "Aさん", team: "Intern", value: 420000 },
    { name: "Bさん", team: "Intern", value: 360000 },
    { name: "Cさん", team: "Intern", value: 280000 },
    { name: "Dさん", team: "Intern", value: 240000 },
  ] as PersonRankingItem[],
  partnerDeals: [
    { name: "佐藤 翔永", team: "Biz", value: 9 },
    { name: "平賀 匡", team: "Biz", value: 8 },
    { name: "金岡 伶皇", team: "Biz", value: 7 },
    { name: "Aさん", team: "Intern", value: 5 },
    { name: "Bさん", team: "Intern", value: 4 },
    { name: "Cさん", team: "Intern", value: 3 },
    { name: "Dさん", team: "Intern", value: 2 },
  ] as PersonRankingItem[],
};

const dummyPartnerRankings = {
  totalSales: [
    { name: "パートナーA", value: 1200000 },
    { name: "パートナーB", value: 960000 },
    { name: "パートナーC", value: 780000 },
    { name: "パートナーD", value: 520000 },
  ] as PartnerRankingItem[],
  membersCount: [
    { name: "パートナーA", value: 320 },
    { name: "パートナーB", value: 280 },
    { name: "パートナーC", value: 240 },
    { name: "パートナーD", value: 210 },
  ] as PartnerRankingItem[],
  eventCount: [
    { name: "パートナーA", value: 45 },
    { name: "パートナーB", value: 38 },
    { name: "パートナーC", value: 30 },
    { name: "パートナーD", value: 24 },
  ] as PartnerRankingItem[],
};

function formatNumber(value: number): string {
  return value.toLocaleString("ja-JP");
}

// CSV: member_id,member_name,value
type PersonMonthlySalesRow = {
  member_id: string;
  member_name: string;
  value: number;
};

function parsePersonMonthlySalesCsv(csvText: string): PersonRankingItem[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxMemberName = header.findIndex((h) => h === "member_name");
  const idxValue = header.findIndex((h) => h === "value" || h === "sum" || h === "total");
  const idxTeam = header.findIndex((h) => h === "meta" || h === "team");

  if (idxMemberName === -1 || idxValue === -1) {
    return [];
  }

  const items: PersonRankingItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");

    const rawName = cols[idxMemberName] ?? "";
    const rawValue = cols[idxValue] ?? "";
    const rawTeam = idxTeam >= 0 ? cols[idxTeam] ?? "" : "";

    const name = rawName.trim();
    if (!name) continue;

    const num = Number(rawValue.replace(/[,\s]/g, ""));
    if (!Number.isFinite(num)) continue;

    const team = rawTeam.trim();

    items.push({
      name,
      value: num,
      team: team || undefined,
    });
  }

  // すでにシート側で並び替え済みの想定だが、念のためここでも降順ソート
  items.sort((a, b) => b.value - a.value);
  return items;
}

// CSV: partner_id,partner_name,value,meta,team
function parsePartnerRankingCsv(csvText: string): PartnerRankingItem[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxName = header.findIndex((h) => h === "partner_name" || h === "name");
  const idxValue = header.findIndex((h) => h === "value" || h === "sum" || h === "total");

  if (idxName === -1 || idxValue === -1) {
    return [];
  }

  const items: PartnerRankingItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");

    const rawName = cols[idxName] ?? "";
    const rawValue = cols[idxValue] ?? "";

    const name = rawName.trim();
    if (!name) continue;

    const num = Number(rawValue.replace(/[,_\s]/g, ""));
    if (!Number.isFinite(num)) continue;

    items.push({
      name,
      value: num,
    });
  }

  items.sort((a, b) => b.value - a.value);
  return items;
}

function PersonRankingCard({
  title,
  unit,
  items,
}: {
  title: string;
  unit: string;
  items: PersonRankingItem[];
}) {
  const sliced = items.slice(0, 7);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </h3>
      <div className="mt-3 space-y-1.5 text-xs text-neutral-700 dark:text-neutral-200">
        {sliced.map((item, index) => {
          const isTop3 = index < 3;
          const isTop1 = index === 0;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between gap-3 rounded-md ${
                isTop1
                  ? "bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 shadow-md"
                  : "bg-neutral-50 dark:bg-neutral-800/60"
              } ${
                isTop1 ? "px-3.5 py-2.5" : isTop3 ? "px-3 py-2" : "px-2 py-1.5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center rounded-full font-semibold text-white ${
                    isTop1
                      ? "h-8 w-8 text-[13px]"
                      : isTop3
                      ? "h-7 w-7 text-[12px]"
                      : "h-6 w-6 text-[11px]"
                  }`}
                  style={{
                    backgroundColor:
                      index === 0
                        ? MAIN_COLOR
                        : index === 1
                        ? "#c0b399"
                        : index === 2
                        ? "#d3c8af"
                        : "#d4d4d4",
                  }}
                >
                  {index + 1}
                </span>
                <div>
                  <p
                    className={`font-medium text-neutral-900 dark:text-neutral-50 ${
                      isTop1 ? "text-base" : isTop3 ? "text-sm" : "text-xs"
                    }`}
                  >
                    {item.name}
                  </p>
                  {item.team && (
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {item.team}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <p
                  className={`font-semibold text-neutral-900 dark:text-neutral-50 ${
                    isTop1 ? "text-lg" : isTop3 ? "text-base" : "text-sm"
                  }`}
                >
                  今月：{formatNumber(item.value)}
                  <span className="ml-0.5 text-[10px] font-normal text-neutral-500">
                    {unit}
                  </span>
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  累計：{formatNumber(item.value)} {unit}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PartnerRankingCard({
  title,
  unit,
  items,
}: {
  title: string;
  unit: string;
  items: PartnerRankingItem[];
}) {
  const sliced = items.slice(0, 7);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </h3>
      <div className="mt-3 space-y-1.5 text-xs text-neutral-700 dark:text-neutral-200">
        {sliced.map((item, index) => {
          const isTop3 = index < 3;
          const isTop1 = index === 0;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between gap-3 rounded-md ${
                isTop1
                  ? "bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 shadow-md"
                  : "bg-neutral-50 dark:bg-neutral-800/60"
              } ${
                isTop1 ? "px-3.5 py-2.5" : isTop3 ? "px-3 py-2" : "px-2 py-1.5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center rounded-full font-semibold text-white ${
                    isTop1
                      ? "h-8 w-8 text-[13px]"
                      : isTop3
                      ? "h-7 w-7 text-[12px]"
                      : "h-6 w-6 text-[11px]"
                  }`}
                  style={{
                    backgroundColor:
                      index === 0
                        ? MAIN_COLOR
                        : index === 1
                        ? "#c0b399"
                        : index === 2
                        ? "#d3c8af"
                        : "#d4d4d4",
                  }}
                >
                  {index + 1}
                </span>
                <p
                  className={`font-medium text-neutral-900 dark:text-neutral-50 ${
                    isTop1 ? "text-base" : isTop3 ? "text-sm" : "text-xs"
                  }`}
                >
                  {item.name}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p
                  className={`font-semibold text-neutral-900 dark:text-neutral-50 ${
                    isTop1 ? "text-lg" : isTop3 ? "text-base" : "text-sm"
                  }`}
                >
                  今月：{formatNumber(item.value)}
                  <span className="ml-0.5 text-[10px] font-normal text-neutral-500">
                    {unit}
                  </span>
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  累計：{formatNumber(item.value)} {unit}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<"person" | "partner">("person");
  const [period, setPeriod] = useState<"monthly" | "total">("monthly");

  // デバッグ: /rankings ページがクライアント側で実行されているか確認
  console.log("[rankings] RankingsPage render");

  const [personMonthlySales, setPersonMonthlySales] = useState<PersonRankingItem[] | null>(null);
  const [personMonthlySalesError, setPersonMonthlySalesError] = useState<string | null>(null);
  const [personMonthlyMembers, setPersonMonthlyMembers] = useState<PersonRankingItem[] | null>(null);
  const [personMonthlyMembersError, setPersonMonthlyMembersError] = useState<string | null>(null);
  const [personMonthlyEvents, setPersonMonthlyEvents] = useState<PersonRankingItem[] | null>(null);
  const [personMonthlyEventsError, setPersonMonthlyEventsError] = useState<string | null>(null);
  const [personMonthlyPartnerDeals, setPersonMonthlyPartnerDeals] = useState<PersonRankingItem[] | null>(null);
  const [personMonthlyPartnerDealsError, setPersonMonthlyPartnerDealsError] = useState<string | null>(null);
  const [partnerSalesMonthly, setPartnerSalesMonthly] = useState<PartnerRankingItem[] | null>(null);
  const [partnerSalesTotal, setPartnerSalesTotal] = useState<PartnerRankingItem[] | null>(null);
  const [partnerMembersMonthly, setPartnerMembersMonthly] = useState<PartnerRankingItem[] | null>(null);
  const [partnerMembersTotal, setPartnerMembersTotal] = useState<PartnerRankingItem[] | null>(null);
  const [partnerEventsMonthly, setPartnerEventsMonthly] = useState<PartnerRankingItem[] | null>(null);
  const [partnerEventsTotal, setPartnerEventsTotal] = useState<PartnerRankingItem[] | null>(null);

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PERSON_RANKING_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PERSON_RANKING_MONTHLY_CSV_URL", envUrl);

    // TODO: 環境変数が正しく渡るようになったら、このハードコードは削除する
    const fallbackUrl =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=464200089";

    const url = envUrl || fallbackUrl;

    // デバッグ用ログ
    console.log("[rankings] PERSON_RANKING_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePersonMonthlySalesCsv(text);
        console.log("[rankings] personMonthlySales parsed", parsed.slice(0, 5));
        if (parsed.length === 0) {
          setPersonMonthlySalesError("ランキングCSVに有効なデータがありません");
        }
        setPersonMonthlySales(parsed);
      } catch (e) {
        console.error("Failed to load person monthly sales rankings", e);
        if (!cancelled) {
          setPersonMonthlySalesError("ランキングデータの取得に失敗しました");
        }
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・イベント送客数ランキング（今月）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_EVENTS_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_EVENTS_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlMonthlyEvents =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=536126953";

    const url = envUrl || fallbackUrlMonthlyEvents;
    console.log("[rankings] PARTNER_RANKING_EVENTS_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner monthly events rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerEventsMonthly parsed", parsed.slice(0, 5));
        setPartnerEventsMonthly(parsed);
      } catch (e) {
        console.error("Failed to load partner monthly events rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・イベント送客数ランキング（累計）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_EVENTS_TOTAL_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_EVENTS_TOTAL_CSV_URL", envUrl);

    const fallbackUrlTotalEvents =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=1915625180";

    const url = envUrl || fallbackUrlTotalEvents;
    console.log("[rankings] PARTNER_RANKING_EVENTS_TOTAL_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner total events rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerEventsTotal parsed", parsed.slice(0, 5));
        setPartnerEventsTotal(parsed);
      } catch (e) {
        console.error("Failed to load partner total events rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・登録会員数ランキング（今月）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_MEMBERS_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_MEMBERS_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlMonthlyMembers =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=51313277";

    const url = envUrl || fallbackUrlMonthlyMembers;
    console.log("[rankings] PARTNER_RANKING_MEMBERS_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner monthly members rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerMembersMonthly parsed", parsed.slice(0, 5));
        setPartnerMembersMonthly(parsed);
      } catch (e) {
        console.error("Failed to load partner monthly members rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・登録会員数ランキング（累計）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_MEMBERS_TOTAL_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_MEMBERS_TOTAL_CSV_URL", envUrl);

    const fallbackUrlTotalMembers =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=437048072";

    const url = envUrl || fallbackUrlTotalMembers;
    console.log("[rankings] PARTNER_RANKING_MEMBERS_TOTAL_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner total members rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerMembersTotal parsed", parsed.slice(0, 5));
        setPartnerMembersTotal(parsed);
      } catch (e) {
        console.error("Failed to load partner total members rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・総売上ランキング（今月）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_SALES_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_SALES_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlMonthly =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=486425278";

    const url = envUrl || fallbackUrlMonthly;
    console.log("[rankings] PARTNER_RANKING_SALES_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner monthly sales rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerSalesMonthly parsed", parsed.slice(0, 5));
        setPartnerSalesMonthly(parsed);
      } catch (e) {
        console.error("Failed to load partner monthly sales rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // パートナー別・総売上ランキング（累計）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PARTNER_RANKING_SALES_TOTAL_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PARTNER_RANKING_SALES_TOTAL_CSV_URL", envUrl);

    const fallbackUrlTotal =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=745459084";

    const url = envUrl || fallbackUrlTotal;
    console.log("[rankings] PARTNER_RANKING_SALES_TOTAL_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner total sales rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePartnerRankingCsv(text);
        console.log("[rankings] partnerSalesTotal parsed", parsed.slice(0, 5));
        setPartnerSalesTotal(parsed);
      } catch (e) {
        console.error("Failed to load partner total sales rankings", e);
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // 個人・今月のパートナー提携数ランキング
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PERSON_RANKING_PARTNER_DEALS_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PERSON_RANKING_PARTNER_DEALS_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlPartnerDeals =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=592524543";

    const url = envUrl || fallbackUrlPartnerDeals;
    console.log("[rankings] PERSON_RANKING_PARTNER_DEALS_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch partner deals rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePersonMonthlySalesCsv(text);
        console.log("[rankings] personMonthlyPartnerDeals parsed", parsed.slice(0, 5));
        if (parsed.length === 0) {
          setPersonMonthlyPartnerDealsError("パートナー提携数ランキングCSVに有効なデータがありません");
        }
        setPersonMonthlyPartnerDeals(parsed);
      } catch (e) {
        console.error("Failed to load person monthly partner deals rankings", e);
        if (!cancelled) {
          setPersonMonthlyPartnerDealsError("パートナー提携数ランキングデータの取得に失敗しました");
        }
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // 個人・今月のイベント送客数ランキング
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_PERSON_RANKING_EVENTS_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PERSON_RANKING_EVENTS_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlEvents =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=185195888";

    const url = envUrl || fallbackUrlEvents;
    console.log("[rankings] PERSON_RANKING_EVENTS_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch events rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePersonMonthlySalesCsv(text);
        console.log("[rankings] personMonthlyEvents parsed", parsed.slice(0, 5));
        if (parsed.length === 0) {
          setPersonMonthlyEventsError("イベント送客数ランキングCSVに有効なデータがありません");
        }
        setPersonMonthlyEvents(parsed);
      } catch (e) {
        console.error("Failed to load person monthly events rankings", e);
        if (!cancelled) {
          setPersonMonthlyEventsError("イベント送客数ランキングデータの取得に失敗しました");
        }
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  // 個人・今月の登録会員数ランキング
  useEffect(() => {
    // env 経由の設定があればそちらを優先し、なければ会員数ランキング用シートのURLを使用
    const envUrl = process.env.NEXT_PUBLIC_PERSON_RANKING_MEMBERS_MONTHLY_CSV_URL;
    console.log("[rankings] env NEXT_PUBLIC_PERSON_RANKING_MEMBERS_MONTHLY_CSV_URL", envUrl);

    const fallbackUrlMembers =
      "https://docs.google.com/spreadsheets/d/19TugdbeZ_ugY9uX0bayASjmUk_5GQRro2vXD6sIfsjs/export?format=csv&gid=2041553288";

    const url = envUrl || fallbackUrlMembers;
    console.log("[rankings] PERSON_RANKING_MEMBERS_MONTHLY_CSV_URL", url);

    let cancelled = false;

    const fetchCsv = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch members rankings CSV: ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const parsed = parsePersonMonthlySalesCsv(text);
        console.log("[rankings] personMonthlyMembers parsed", parsed.slice(0, 5));
        if (parsed.length === 0) {
          setPersonMonthlyMembersError("会員数ランキングCSVに有効なデータがありません");
        }
        setPersonMonthlyMembers(parsed);
      } catch (e) {
        console.error("Failed to load person monthly members rankings", e);
        if (!cancelled) {
          setPersonMonthlyMembersError("会員数ランキングデータの取得に失敗しました");
        }
      }
    };

    fetchCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Ranking Board
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/ranking-icon.png"
                alt="ランキングボードアイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              ランキングボード
            </h1>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            会員数・パートナー提携数・イベント送客数・総売上をもとに、個人とパートナーのランキングを俯瞰できるボードです。今月と累計の数値をあわせてチェックできます。
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex gap-2 border-b border-dashed border-neutral-200 pb-2 text-xs dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("person")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                activeTab === "person"
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              個人ランキング
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("partner")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                activeTab === "partner"
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              パートナーランキング
            </button>
          </div>
          {/* 今月 / 累計 トグル */}
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
            <span className="hidden sm:inline">表示期間:</span>
            <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-0.5 text-[11px] dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`rounded-full px-3 py-1 ${
                  period === "monthly"
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                今月
              </button>
              <button
                type="button"
                onClick={() => setPeriod("total")}
                className={`rounded-full px-3 py-1 ${
                  period === "total"
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                累計
              </button>
            </div>
          </div>

          <div className="mt-3">
            {activeTab === "person" ? (
              <div className="grid gap-4 md:grid-cols-3">
                {personMonthlySalesError && (
                  <div className="md:col-span-3">
                    <p className="text-[11px] text-red-500">
                      {personMonthlySalesError}
                    </p>
                  </div>
                )}
                <PersonRankingCard
                  title="総売上ランキング"
                  unit="円"
                  items={
                    personMonthlySales && personMonthlySales.length > 0
                      ? personMonthlySales
                      : dummyPersonRankings.totalSales
                  }
                />
                <PersonRankingCard
                  title="登録会員数ランキング"
                  unit="件"
                  items={
                    personMonthlyMembers && personMonthlyMembers.length > 0
                      ? personMonthlyMembers
                      : dummyPersonRankings.membersCount
                  }
                />
                <PersonRankingCard
                  title="イベント送客数ランキング"
                  unit="件"
                  items={
                    personMonthlyEvents && personMonthlyEvents.length > 0
                      ? personMonthlyEvents
                      : dummyPersonRankings.eventCount
                  }
                />
                <PersonRankingCard
                  title="パートナー提携数ランキング"
                  unit="件"
                  items={
                    personMonthlyPartnerDeals && personMonthlyPartnerDeals.length > 0
                      ? personMonthlyPartnerDeals
                      : dummyPersonRankings.partnerDeals
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <PartnerRankingCard
                  title="総売上ランキング（パートナー別）"
                  unit="円"
                  items={
                    period === "monthly"
                      ? partnerSalesMonthly && partnerSalesMonthly.length > 0
                        ? partnerSalesMonthly
                        : dummyPartnerRankings.totalSales
                      : partnerSalesTotal && partnerSalesTotal.length > 0
                      ? partnerSalesTotal
                      : dummyPartnerRankings.totalSales
                  }
                />
                <PartnerRankingCard
                  title="登録会員数ランキング（パートナー別）"
                  unit="件"
                  items={
                    period === "monthly"
                      ? partnerMembersMonthly && partnerMembersMonthly.length > 0
                        ? partnerMembersMonthly
                        : dummyPartnerRankings.membersCount
                      : partnerMembersTotal && partnerMembersTotal.length > 0
                      ? partnerMembersTotal
                      : dummyPartnerRankings.membersCount
                  }
                />
                <PartnerRankingCard
                  title="イベント送客数ランキング（パートナー別）"
                  unit="件"
                  items={
                    period === "monthly"
                      ? partnerEventsMonthly && partnerEventsMonthly.length > 0
                        ? partnerEventsMonthly
                        : dummyPartnerRankings.eventCount
                      : partnerEventsTotal && partnerEventsTotal.length > 0
                      ? partnerEventsTotal
                      : dummyPartnerRankings.eventCount
                  }
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
