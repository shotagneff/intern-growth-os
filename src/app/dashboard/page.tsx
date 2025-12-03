import Image from "next/image";

export const dynamic = "force-dynamic";

type BusinessKey = "career" | "design";

type MembershipKpiRow = {
  year: number;
  month: number;
  membership_actual: number | null;
  membership_target: number | null;
  membership_cumulative_actual?: number | null;
  membership_cumulative_target?: number | null;
  membership_target_annual?: number | null;
  note?: string;
};

type PartnerKpiRow = {
  year: number;
  month: number;
  partner_actual: number | null;
  partner_target: number | null;
  partner_cumulative_actual?: number | null;
  partner_cumulative_target?: number | null;
  partner_target_annual?: number | null;
  note?: string;
};

type SalesKpiRow = {
  year: number;
  month: number;
  event_sales_actual: number | null;
  event_sales_target: number | null;
  event_sales_target_annual?: number | null;
  total_sales_actual: number | null;
  total_sales_target: number | null;
  total_sales_target_annual?: number | null;
  note?: string;
};

function parseMembershipCsv(csv: string): MembershipKpiRow[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  // Google スプレッドシートの CSV はロケールによってカンマではなくセミコロン区切りになることがあるため、区切り文字を自動判定する
  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const header = lines[0].split(delimiter).map((h) => h.trim());

  const idxYear = header.indexOf("year");
  const idxMonth = header.indexOf("month");
  const idxActual = header.indexOf("membership_actual");
  const idxTarget = header.indexOf("membership_target");
  const idxCumActual = header.indexOf("membership_cumulative_actual");
  const idxCumTarget = header.indexOf("membership_cumulative_target");
  const idxTargetAnnual = header.indexOf("membership_target_annual");
  const idxNote = header.indexOf("note");

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);
    const year = idxYear >= 0 ? Number(cols[idxYear] ?? "") : NaN;
    const month = idxMonth >= 0 ? Number(cols[idxMonth] ?? "") : NaN;
    const membership_actual_raw = idxActual >= 0 ? cols[idxActual] ?? "" : "";
    const membership_target_raw = idxTarget >= 0 ? cols[idxTarget] ?? "" : "";
    const membership_cum_actual_raw = idxCumActual >= 0 ? cols[idxCumActual] ?? "" : "";
    const membership_cum_target_raw = idxCumTarget >= 0 ? cols[idxCumTarget] ?? "" : "";
    const membership_target_annual_raw = idxTargetAnnual >= 0 ? cols[idxTargetAnnual] ?? "" : "";

    const membership_actual = membership_actual_raw.trim()
      ? Number(membership_actual_raw.replace(/,/g, ""))
      : null;
    const membership_target = membership_target_raw.trim()
      ? Number(membership_target_raw.replace(/,/g, ""))
      : null;
    const membership_cumulative_actual = membership_cum_actual_raw.trim()
      ? Number(membership_cum_actual_raw.replace(/,/g, ""))
      : null;
    const membership_cumulative_target = membership_cum_target_raw.trim()
      ? Number(membership_cum_target_raw.replace(/,/g, ""))
      : null;

    const membership_target_annual = membership_target_annual_raw.trim()
      ? Number(membership_target_annual_raw.replace(/,/g, ""))
      : null;

    const note = idxNote >= 0 ? (cols[idxNote] ?? "").trim() || undefined : undefined;

    return {
      year,
      month,
      membership_actual: Number.isFinite(membership_actual) ? membership_actual : null,
      membership_target: Number.isFinite(membership_target) ? membership_target : null,
      membership_cumulative_actual: Number.isFinite(membership_cumulative_actual)
        ? membership_cumulative_actual
        : null,
      membership_cumulative_target: Number.isFinite(membership_cumulative_target)
        ? membership_cumulative_target
        : null,
      membership_target_annual: Number.isFinite(membership_target_annual)
        ? membership_target_annual
        : null,
      note,
    };
  });
}

function parsePartnerCsv(csv: string): PartnerKpiRow[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const header = lines[0].split(delimiter).map((h) => h.trim());

  const idxYear = header.indexOf("year");
  const idxMonth = header.indexOf("month");
  const idxActual = header.indexOf("partner_actual");
  const idxTarget = header.indexOf("partner_target");
  const idxCumActual = header.indexOf("partner_cumulative_actual");
  const idxCumTarget = header.indexOf("partner_cumulative_target");
  const idxTargetAnnual = header.indexOf("partner_target_annual");
  const idxNote = header.indexOf("note");

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);
    const year = idxYear >= 0 ? Number(cols[idxYear] ?? "") : NaN;
    const month = idxMonth >= 0 ? Number(cols[idxMonth] ?? "") : NaN;

    const partner_actual_raw = idxActual >= 0 ? cols[idxActual] ?? "" : "";
    const partner_target_raw = idxTarget >= 0 ? cols[idxTarget] ?? "" : "";
    const partner_cum_actual_raw = idxCumActual >= 0 ? cols[idxCumActual] ?? "" : "";
    const partner_cum_target_raw = idxCumTarget >= 0 ? cols[idxCumTarget] ?? "" : "";
    const partner_target_annual_raw = idxTargetAnnual >= 0 ? cols[idxTargetAnnual] ?? "" : "";

    const partner_actual = partner_actual_raw.trim()
      ? Number(partner_actual_raw.replace(/,/g, ""))
      : null;
    const partner_target = partner_target_raw.trim()
      ? Number(partner_target_raw.replace(/,/g, ""))
      : null;
    const partner_cumulative_actual = partner_cum_actual_raw.trim()
      ? Number(partner_cum_actual_raw.replace(/,/g, ""))
      : null;
    const partner_cumulative_target = partner_cum_target_raw.trim()
      ? Number(partner_cum_target_raw.replace(/,/g, ""))
      : null;

    const partner_target_annual = partner_target_annual_raw.trim()
      ? Number(partner_target_annual_raw.replace(/,/g, ""))
      : null;

    const note = idxNote >= 0 ? (cols[idxNote] ?? "").trim() || undefined : undefined;

    return {
      year,
      month,
      partner_actual: Number.isFinite(partner_actual) ? partner_actual : null,
      partner_target: Number.isFinite(partner_target) ? partner_target : null,
      partner_cumulative_actual: Number.isFinite(partner_cumulative_actual)
        ? partner_cumulative_actual
        : null,
      partner_cumulative_target: Number.isFinite(partner_cumulative_target)
        ? partner_cumulative_target
        : null,
      partner_target_annual: Number.isFinite(partner_target_annual)
        ? partner_target_annual
        : null,
      note,
    };
  });
}

function parseSalesCsv(csv: string): SalesKpiRow[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const header = lines[0].split(delimiter).map((h) => h.trim());

  const idxYear = header.indexOf("year");
  const idxMonth = header.indexOf("month");

  // ヘッダー名は多少ブレても拾えるように、プレフィックスとキーワードで判定する
  const findIndex = (pred: (h: string) => boolean) => header.findIndex(pred);

  const idxEventActual = findIndex(
    (h) => h.startsWith("event_sale") && !h.includes("target")
  );
  const idxEventTarget = findIndex(
    (h) => h.startsWith("event_sale") && h.includes("target") && !h.includes("annual")
  );
  const idxEventTargetAnnual = findIndex(
    (h) => h.startsWith("event_sale") && h.includes("target") && h.includes("annual")
  );

  const idxTotalActual = findIndex(
    (h) => h.startsWith("total_sale") && !h.includes("target")
  );
  const idxTotalTarget = findIndex(
    (h) => h.startsWith("total_sale") && h.includes("target") && !h.includes("annual")
  );
  const idxTotalTargetAnnual = findIndex(
    (h) => h.startsWith("total_sale") && h.includes("target") && h.includes("annual")
  );

  const idxNote = header.indexOf("note");

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);
    const year = idxYear >= 0 ? Number(cols[idxYear] ?? "") : NaN;
    const month = idxMonth >= 0 ? Number(cols[idxMonth] ?? "") : NaN;

    const event_actual_raw = idxEventActual >= 0 ? cols[idxEventActual] ?? "" : "";
    const event_target_raw = idxEventTarget >= 0 ? cols[idxEventTarget] ?? "" : "";
    const event_target_annual_raw = idxEventTargetAnnual >= 0 ? cols[idxEventTargetAnnual] ?? "" : "";

    const total_actual_raw = idxTotalActual >= 0 ? cols[idxTotalActual] ?? "" : "";
    const total_target_raw = idxTotalTarget >= 0 ? cols[idxTotalTarget] ?? "" : "";
    const total_target_annual_raw = idxTotalTargetAnnual >= 0 ? cols[idxTotalTargetAnnual] ?? "" : "";

    const cleanNumber = (raw: string): number | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      // カンマ・円マーク（¥, ￥）を取り除いて数値化
      const normalized = trimmed.replace(/[¥￥,]/g, "");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : null;
    };

    const event_sales_actual = cleanNumber(event_actual_raw);
    const event_sales_target = cleanNumber(event_target_raw);
    const event_sales_target_annual = cleanNumber(event_target_annual_raw);

    const total_sales_actual = cleanNumber(total_actual_raw);
    const total_sales_target = cleanNumber(total_target_raw);
    const total_sales_target_annual = cleanNumber(total_target_annual_raw);

    const note = idxNote >= 0 ? (cols[idxNote] ?? "").trim() || undefined : undefined;

    return {
      year,
      month,
      event_sales_actual: Number.isFinite(event_sales_actual) ? event_sales_actual : null,
      event_sales_target: Number.isFinite(event_sales_target) ? event_sales_target : null,
      event_sales_target_annual: Number.isFinite(event_sales_target_annual)
        ? event_sales_target_annual
        : null,
      total_sales_actual: Number.isFinite(total_sales_actual) ? total_sales_actual : null,
      total_sales_target: Number.isFinite(total_sales_target) ? total_sales_target : null,
      total_sales_target_annual: Number.isFinite(total_sales_target_annual)
        ? total_sales_target_annual
        : null,
      note,
    };
  });
}

async function fetchMembershipKpi(business: BusinessKey): Promise<MembershipKpiRow[]> {
  const url =
    business === "design"
      ? process.env.MEMBERSHIP_KPI_CSV_URL_DESIGN
      : process.env.MEMBERSHIP_KPI_CSV_URL_CAREER ?? process.env.MEMBERSHIP_KPI_CSV_URL;
  if (!url) return [];

  // デバッグ用ログ
  // eslint-disable-next-line no-console
  console.log("[Membership_KPI fetch] business=", business, "url=", url);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.log("[Membership_KPI fetch error] status=", res.status, res.statusText);
    return [];
  }

  const text = await res.text();
  const parsed = parseMembershipCsv(text);
  // eslint-disable-next-line no-console
  console.log("[Membership_KPI first row]", parsed[0]);
  return parsed;
}

async function fetchPartnerKpi(business: BusinessKey): Promise<PartnerKpiRow[]> {
  const url =
    business === "design"
      ? process.env.PARTNER_KPI_CSV_URL_DESIGN
      : process.env.PARTNER_KPI_CSV_URL_CAREER ?? process.env.PARTNER_KPI_CSV_URL;
  if (!url) return [];

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const text = await res.text();
  return parsePartnerCsv(text);
}

async function fetchSalesKpi(business: BusinessKey): Promise<SalesKpiRow[]> {
  const url =
    business === "design"
      ? process.env.SALES_KPI_CSV_URL_DESIGN
      : process.env.SALES_KPI_CSV_URL_CAREER ?? process.env.SALES_KPI_CSV_URL;
  if (!url) return [];

  // デバッグ用ログ
  // eslint-disable-next-line no-console
  console.log("[Sales_KPI fetch] business=", business, "url=", url);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.log("[Sales_KPI fetch error] status=", res.status, res.statusText);
    return [];
  }

  const text = await res.text();
  const parsed = parseSalesCsv(text);
  // eslint-disable-next-line no-console
  console.log("[Sales_KPI first row]", parsed[0]);
  return parsed;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const business: BusinessKey =
    resolvedSearchParams?.business === "design" ? "design" : "career";

  console.log("[Dashboard business]", resolvedSearchParams?.business, business);

  const [membershipKpi, partnerKpi, salesKpi] = await Promise.all([
    fetchMembershipKpi(business),
    fetchPartnerKpi(business),
    fetchSalesKpi(business),
  ]);

  const latestMembership =
    membershipKpi.length > 0
      ? [...membershipKpi]
          .reverse()
          .find(
            (row) =>
              (row.membership_cumulative_actual != null && row.membership_cumulative_actual !== 0) ||
              (row.membership_actual != null && row.membership_actual !== 0)
          ) ?? membershipKpi[membershipKpi.length - 1]
      : undefined;

  const membershipActual =
    latestMembership?.membership_cumulative_actual ?? latestMembership?.membership_actual ?? 0;
  const targetAnnualForYear = latestMembership
    ? membershipKpi.find(
        (row) =>
          row.year === latestMembership.year &&
          row.membership_target_annual != null &&
          row.membership_target_annual !== 0
      )?.membership_target_annual ?? null
    : null;

  const membershipTarget =
    targetAnnualForYear ?? latestMembership?.membership_target ?? 0;
  const membershipAchievementRate =
    membershipActual && membershipTarget
      ? Math.round((membershipActual / membershipTarget) * 100)
      : 0;

  // 全期間を対象にするため、12ヶ月に固定せず全行を利用
  const membershipMonthly = membershipKpi;

  const membershipMonthlyActuals = membershipMonthly.map((row) =>
    row.membership_actual != null && row.membership_actual !== 0 ? row.membership_actual : 0
  );

  const membershipMonthlyTargets = membershipMonthly.map((row) =>
    row.membership_target != null && row.membership_target !== 0 ? row.membership_target : 0
  );

  const membershipMonthlyAchievementRates = membershipMonthly.map((row) => {
    const actual = row.membership_actual ?? 0;
    const target = row.membership_target ?? 0;
    if (!actual || !target) return 0;
    return Math.round((actual / target) * 100);
  });

  const membershipMonthlyCumulativeActuals: number[] = [];
  const membershipMonthlyCumulativeRates = (() => {
    let cumActual = 0;
    return membershipMonthly.map((row) => {
      cumActual += row.membership_actual ?? 0;
      membershipMonthlyCumulativeActuals.push(cumActual);
      if (!cumActual || !membershipTarget) return 0;
      return Math.round((cumActual / membershipTarget) * 100);
    });
  })();

  const membershipChartActuals = membershipMonthlyActuals.slice(0, 5);
  const membershipChartCumulativeRates = membershipMonthlyCumulativeRates.slice(
    0,
    membershipChartActuals.length
  );

  // 会員グラフの縦軸は 0, 5, 10 固定とし、10件でてっぺんに届くようにする
  const membershipChartMaxActual = 10;

  const membershipChartLinePoints = (() => {
    const n = membershipChartCumulativeRates.length;
    if (n === 0) return "";
    if (n === 1) return "0,50";
    return membershipChartCumulativeRates
      .map((rate, idx) => {
        const clamped = Math.min(rate, 100);
        const x = (idx / (n - 1)) * 100;
        const y = 100 - clamped;
        return `${x},${y}`;
      })
      .join(" ");
  })();

  // パートナーKPI
  const latestPartner =
    partnerKpi.length > 0
      ? [...partnerKpi]
          .reverse()
          .find(
            (row) =>
              (row.partner_cumulative_actual != null && row.partner_cumulative_actual !== 0) ||
              (row.partner_actual != null && row.partner_actual !== 0)
          ) ?? partnerKpi[partnerKpi.length - 1]
      : undefined;

  const partnerActual =
    latestPartner?.partner_cumulative_actual ?? latestPartner?.partner_actual ?? 0;

  const partnerTargetAnnualForYear = latestPartner
    ? partnerKpi.find(
        (row) =>
          row.year === latestPartner.year &&
          row.partner_target_annual != null &&
          row.partner_target_annual !== 0
      )?.partner_target_annual ?? null
    : null;

  const partnerTarget =
    partnerTargetAnnualForYear ?? latestPartner?.partner_target ?? 0;

  const partnerAchievementRate =
    partnerActual && partnerTarget
      ? Math.round((partnerActual / partnerTarget) * 100)
      : 0;

  // 全期間を対象にするため、12ヶ月に固定せず全行を利用
  const partnerMonthly = partnerKpi;

  const partnerMonthlyActuals = partnerMonthly.map((row) =>
    row.partner_actual != null && row.partner_actual !== 0 ? row.partner_actual : 0
  );

  const partnerMonthlyTargets = partnerMonthly.map((row) =>
    row.partner_target != null && row.partner_target !== 0 ? row.partner_target : 0
  );

  const partnerMonthlyAchievementRates = partnerMonthly.map((row) => {
    const actual = row.partner_actual ?? 0;
    const target = row.partner_target ?? 0;
    if (!actual || !target) return 0;
    return Math.round((actual / target) * 100);
  });

  const partnerMonthlyCumulativeActuals: number[] = [];
  const partnerMonthlyCumulativeRates = (() => {
    let cumActual = 0;
    return partnerMonthly.map((row) => {
      // シートに累計値があればそれを優先し、なければ partner_actual の累積を使う
      if (row.partner_cumulative_actual != null && row.partner_cumulative_actual !== 0) {
        cumActual = row.partner_cumulative_actual;
      } else {
        cumActual += row.partner_actual ?? 0;
      }
      partnerMonthlyCumulativeActuals.push(cumActual);
      if (!cumActual || !partnerTarget) return 0;
      return Math.round((cumActual / partnerTarget) * 100);
    });
  })();

  // パートナーのグラフは「実数値が入っている最後の月」までを表示する
  const lastPartnerIndexWithValue = (() => {
    let last = -1;
    partnerMonthlyActuals.forEach((v, idx) => {
      if (v !== 0) last = idx;
    });
    return last;
  })();

  const partnerChartActuals =
    lastPartnerIndexWithValue >= 0
      ? partnerMonthlyActuals.slice(0, lastPartnerIndexWithValue + 1)
      : [];

  // 売上KPI（イベント送客・総売上）
  const latestEventSales =
    salesKpi.length > 0
      ? [...salesKpi]
          .reverse()
          .find((row) => row.event_sales_actual != null && row.event_sales_actual !== 0) ??
        salesKpi[salesKpi.length - 1]
      : undefined;

  const eventSalesActual = latestEventSales?.event_sales_actual ?? 0;

  const eventSalesTargetAnnualForYear = latestEventSales
    ? salesKpi.find(
        (row) =>
          row.year === latestEventSales.year &&
          row.event_sales_target_annual != null &&
          row.event_sales_target_annual !== 0
      )?.event_sales_target_annual ?? null
    : null;

  const eventSalesTarget =
    eventSalesTargetAnnualForYear ?? latestEventSales?.event_sales_target ?? 0;

  const eventSalesAchievementRate =
    eventSalesActual && eventSalesTarget
      ? Math.round((eventSalesActual / eventSalesTarget) * 100)
      : 0;

  const latestTotalSales =
    salesKpi.length > 0
      ? [...salesKpi]
          .reverse()
          .find((row) => row.total_sales_actual != null && row.total_sales_actual !== 0) ??
        // total_sales_actual がすべて 0 / 空の場合は、イベント売上の最新行をフォールバックとして利用
        latestEventSales ?? salesKpi[salesKpi.length - 1]
      : undefined;

  // 月間総売上カードでは「全期間の売上合計値」を表示したいので、全行分の actual を合算する
  const totalSalesActual = salesKpi.reduce((sum, row) => {
    const totalActual =
      row.total_sales_actual != null && row.total_sales_actual !== 0 ? row.total_sales_actual : 0;
    const eventActual =
      row.event_sales_actual != null && row.event_sales_actual !== 0 ? row.event_sales_actual : 0;
    return sum + (totalActual || eventActual);
  }, 0);

  const totalSalesTargetAnnualForYear = latestTotalSales
    ? salesKpi.find(
        (row) =>
          row.year === latestTotalSales.year &&
          row.total_sales_target_annual != null &&
          row.total_sales_target_annual !== 0
      )?.total_sales_target_annual ?? null
    : null;

  const totalSalesTargetFromRow =
    latestTotalSales && latestTotalSales.total_sales_target != null && latestTotalSales.total_sales_target !== 0
      ? latestTotalSales.total_sales_target
      : 0;

  const totalSalesTargetFallbackFromEvent =
    eventSalesTargetAnnualForYear ?? latestEventSales?.event_sales_target ?? 0;

  const totalSalesTarget =
    totalSalesTargetAnnualForYear && totalSalesTargetAnnualForYear !== 0
      ? totalSalesTargetAnnualForYear
      : totalSalesTargetFromRow || totalSalesTargetFallbackFromEvent;

  const totalSalesAchievementRate =
    totalSalesActual && totalSalesTarget
      ? Math.round((totalSalesActual / totalSalesTarget) * 100)
      : 0;

  // 全期間を対象にするため、12ヶ月に固定せず全行を利用
  const salesMonthly = salesKpi;

  // 一時的なデバッグ: Sales_KPI の先頭1行を確認
  // eslint-disable-next-line no-console
  console.log("[Sales_KPI first row]", salesKpi[0]);

  const eventSalesMonthlyActuals = salesMonthly.map((row) =>
    row.event_sales_actual != null && row.event_sales_actual !== 0 ? row.event_sales_actual : 0
  );

  const eventSalesMonthlyTargets = salesMonthly.map((row) =>
    row.event_sales_target != null && row.event_sales_target !== 0 ? row.event_sales_target : 0
  );

  const eventSalesMonthlyAchievementRates = salesMonthly.map((row) => {
    const actual = row.event_sales_actual ?? 0;
    const target = row.event_sales_target ?? 0;
    if (!actual || !target) return 0;
    return Math.round((actual / target) * 100);
  });

  const eventSalesMonthlyCumulativeActuals: number[] = [];
  const eventSalesMonthlyCumulativeRates = (() => {
    let cumActual = 0;
    return salesMonthly.map((row) => {
      cumActual += row.event_sales_actual ?? 0;
      eventSalesMonthlyCumulativeActuals.push(cumActual);
      if (!cumActual || !eventSalesTarget) return 0;
      return Math.round((cumActual / eventSalesTarget) * 100);
    });
  })();

  const totalSalesMonthlyActuals = salesMonthly.map((row) => {
    const totalActual =
      row.total_sales_actual != null && row.total_sales_actual !== 0 ? row.total_sales_actual : 0;
    const eventActual =
      row.event_sales_actual != null && row.event_sales_actual !== 0 ? row.event_sales_actual : 0;
    return totalActual || eventActual;
  });

  const totalSalesMonthlyTargets = salesMonthly.map((row) => {
    const totalTarget =
      row.total_sales_target != null && row.total_sales_target !== 0 ? row.total_sales_target : 0;
    const eventTarget =
      row.event_sales_target != null && row.event_sales_target !== 0 ? row.event_sales_target : 0;
    return totalTarget || eventTarget;
  });

  const totalSalesMonthlyAchievementRates = salesMonthly.map((row) => {
    const totalActual =
      row.total_sales_actual != null && row.total_sales_actual !== 0 ? row.total_sales_actual : 0;
    const totalTarget =
      row.total_sales_target != null && row.total_sales_target !== 0 ? row.total_sales_target : 0;

    const eventActual =
      row.event_sales_actual != null && row.event_sales_actual !== 0 ? row.event_sales_actual : 0;
    const eventTarget =
      row.event_sales_target != null && row.event_sales_target !== 0 ? row.event_sales_target : 0;

    const actual = totalActual || eventActual;
    const target = totalTarget || eventTarget;
    if (!actual || !target) return 0;
    return Math.round((actual / target) * 100);
  });

  const totalSalesMonthlyCumulativeActuals: number[] = [];
  const totalSalesMonthlyCumulativeRates = (() => {
    let cumActual = 0;
    return salesMonthly.map((row, idx) => {
      cumActual += totalSalesMonthlyActuals[idx] ?? 0;
      totalSalesMonthlyCumulativeActuals.push(cumActual);
      if (!cumActual || !totalSalesTarget) return 0;
      return Math.round((cumActual / totalSalesTarget) * 100);
    });
  })();

  // 月ラベルはシートの year/month から動的に生成し、2025年以降も続くようにする
  const MONTH_LABELS = membershipMonthly.map((row) => {
    const yy = String(row.year).slice(-2);
    const mm = String(row.month).padStart(2, "0");
    return `'${yy}/${mm}`.replace("\u007f", "");
  });

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            KGI / KPI Dashboard
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/sales-dashboard.png"
                alt="売上・KPIダッシュボードアイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              売上・KPIダッシュボード
            </h1>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            会員数・パートナー数・売上を月次で追うための、4つの指標ブロックで構成されたダッシュボード（ダミーデータ版）です。
          </p>
          {/* 事業切り替えタブ（全デバイス共通） */}
          <div className="mt-4 inline-flex overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-700 dark:bg-neutral-900/60">
            <a
              href="/dashboard?business=career"
              className={`px-3 py-1 ${
                business === "career"
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              就活支援事業
            </a>
            <a
              href="/dashboard?business=design"
              className={`px-3 py-1 ${
                business === "design"
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              デザイナー育成事業
            </a>
          </div>
        </header>

        {/* KPIセクション見出し */}
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 md:text-sm">
          KPI（会員・パートナー）
        </div>

        {/* 会員数（情報取得数） */}
        <section className="mb-5 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 md:text-lg">
                {business === "design" ? "受講数" : "会員数（情報取得数）"}
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {business === "design"
                  ? "デザイナー育成プログラムの受講人数を、月次でトラッキングする指標です。"
                  : "LINE登録＋プロフィール情報取得が完了した人数を、月次でトラッキングする指標です。"}
              </p>
            </div>
          </div>
          {/* 会員数のサマリーパネル */}
          <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                {business === "design" ? "受講数の合計値" : "会員数の合計値"}
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {membershipActual.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                {business === "design" ? "受講数の目標値" : "会員数の目標値"}
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {membershipTarget.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">目標達成率</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {membershipAchievementRate}%
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(membershipAchievementRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-1">
            {/* 上：棒グラフ + 累計達成率ライン */}
            <div className="flex flex-col justify-between">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月次推移（サンプル）</p>
              <div className="mt-2 flex h-40 rounded-xl border border-neutral-100 bg-neutral-100 px-3 pt-2 pb-1 text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/60">
                {/* 縦軸ラベル（0 / 5 / 10 固定） */}
                <div className="mr-2 flex flex-col justify-between pb-3 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {[membershipChartMaxActual, 5, 0].map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
                {/* グリッド＋バー */}
                <div className="flex-1 pb-0">
                  <div className="relative flex h-full items-end gap-2">
                    {/* 横線ガイド（上・中・下の3本） */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex h-full flex-col justify-between">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-px w-full border-t border-dashed border-neutral-200 dark:border-neutral-700"
                        />
                      ))}
                    </div>
                    {/* 棒グラフ（実数値） */}
                    {membershipChartActuals.map((value, idx) => (
                      <div
                        key={MONTH_LABELS[idx]}
                        className="relative z-10 flex flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className="w-full max-w-[18px] rounded-t-md"
                          style={{
                            // 10件で枠の上まで届くよう、固定ピクセルスケールで高さを計算
                            height: `${(value / membershipChartMaxActual) * 110}px`,
                            backgroundColor: "#9e8d70",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* X軸ラベル（グラフ枠の外、下側） */}
                  <div className="mt-1 flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    {MONTH_LABELS.slice(0, membershipChartActuals.length).map((label) => (
                      <span key={label} className="flex-1 text-center">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 下：12ヶ月テーブル */}
            <div className="flex flex-col justify-between">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月別サマリ（サンプル・単位：名）</p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-[11px] dark:border-neutral-700 dark:bg-neutral-900/60">
                <table className="min-w-full border-collapse text-right text-[12px] md:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-[10px] text-neutral-500 dark:border-neutral-800">
                      <th className="py-1 pr-2 text-left">項目</th>
                      {MONTH_LABELS.map((label, i) => (
                        <th key={i} className="py-1 px-1 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">実数値</td>
                      {membershipMonthlyActuals.map((v, idx) => (
                        <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                          {v === 0 ? "–" : v}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">月間目標</td>
                      {membershipMonthlyTargets.map((v, idx) => (
                        <td key={idx} className="py-1 px-1 text-neutral-900 dark:text-neutral-50">
                          {v === 0 ? "–" : v}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">月間目標達成率</td>
                      {membershipMonthlyAchievementRates.map((r, idx) => (
                        <td key={idx} className="py-1 px-1 text-neutral-900 dark:text-neutral-50">
                          {membershipMonthlyActuals[idx] === 0 ? "–" : `${r}%`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 text-left text-neutral-500">累計達成率（年間）</td>
                      {membershipMonthlyCumulativeRates.map((r, idx) => (
                        <td key={idx} className="py-1 px-1 text-neutral-900 dark:text-neutral-50">
                          {membershipMonthlyCumulativeActuals[idx] === 0 ? "–" : `${r}%`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* パートナー提携数（デザイナー育成事業では非表示） */}
        {business === "career" && (
          <section className="mb-5 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 md:text-lg">パートナー提携数</h2>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  提携完了企業数（イベントパートナー＋面談パートナー）の月次推移と目標達成度を管理します。
                </p>
              </div>
              <a
                href="/partners/mindmap"
                className="inline-flex items-center gap-1 rounded-full bg-[#9e8d70] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#8b7a5f] dark:bg-[#9e8d70] dark:hover:bg-[#7c6c54]"
              >
                <span>紹介マインドマップを見る</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
            {/* パートナー数のサマリーパネル */}
            <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">提携パートナー合計</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                  {partnerActual.toLocaleString()} 社
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">パートナー目標数</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                  {partnerTarget.toLocaleString()} 社
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">目標達成率</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                  {partnerAchievementRate}%
                </p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${Math.min(partnerAchievementRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-1">
              <div className="flex flex-col justify-between">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月次推移（サンプル）</p>
                <div className="mt-2 flex h-40 rounded-xl border border-neutral-100 bg-neutral-100 px-3 pt-2 pb-1 text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/60">
                  {/* 縦軸ラベル（0 / 2 / 4 / 6 固定） */}
                  <div className="mr-2 flex flex-col justify-between pb-3 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {[6, 4, 2, 0].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  {/* グリッド＋バー */}
                  <div className="flex-1 pb-0">
                    <div className="relative flex h-full items-end gap-2">
                      {/* 横線ガイド */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-px w-full border-t border-dashed border-neutral-200 dark:border-neutral-700"
                          />
                        ))}
                      </div>
                      {/* 棒グラフ（データが入っている月まで） */}
                      {partnerChartActuals.map((value, idx) => (
                        <div
                          key={MONTH_LABELS[idx]}
                          className="relative z-10 flex flex-1 flex-col items-center justify-end"
                        >
                          <div
                            className="w-full max-w-[18px] rounded-t-md"
                            style={{ height: `${(value / 6) * 110}px`, backgroundColor: "#9e8d70" }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* X軸ラベル（グラフ枠の外、下側） */}
                    <div className="mt-1 flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      {MONTH_LABELS.slice(0, partnerChartActuals.length).map((label) => (
                        <span key={label} className="flex-1 text-center">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月別サマリ（サンプル・単位：社）</p>
                <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-[11px] dark:border-neutral-700 dark:bg-neutral-900/60">
                  <table className="min-w-full border-collapse text-right text-[12px] md:text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 text-[10px] text-neutral-500 dark:border-neutral-800">
                        <th className="py-1 pr-2 text-left">項目</th>
                        {MONTH_LABELS.map((label, i) => (
                          <th key={i} className="py-1 px-1 font-semibold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                        <td className="py-1 pr-2 text-left text-neutral-500">実数値</td>
                        {partnerMonthlyActuals.map((v, idx) => (
                          <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                            {v === 0 ? "–" : v}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                        <td className="py-1 pr-2 text-left text-neutral-500">月間目標</td>
                        {partnerMonthlyTargets.map((v, idx) => (
                          <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                            {v === 0 ? "–" : v}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                        <td className="py-1 pr-2 text-left text-neutral-500">月間目標達成率</td>
                        {partnerMonthlyAchievementRates.map((r, idx) => (
                          <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                            {partnerMonthlyActuals[idx] === 0 ? "–" : `${r}%`}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 text-left text-neutral-500">累計達成率（年間）</td>
                        {partnerMonthlyCumulativeRates.map((r, idx) => (
                          <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                            {partnerMonthlyCumulativeActuals[idx] === 0 ? "–" : `${r}%`}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* KGI（売上）セクション見出し */}
        <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 md:text-sm">
          KGI（売上）
        </div>

        {/* 月間総売上 */}
        <section className="mb-2 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 md:text-lg">月間総売上</h2>
            </div>
          </div>
          {/* 総売上のサマリーパネル */}
          <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">総売上</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {totalSalesActual.toLocaleString()} 円
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">売上目標</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {totalSalesTarget.toLocaleString()} 円
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">目標達成率</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
                {totalSalesAchievementRate}%
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(totalSalesAchievementRate, 100)}%`,
                    backgroundColor: "#9e8d70",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-1">
            <div className="flex flex-col justify-between">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月次推移（サンプル）</p>
              <div className="mt-2 flex h-40 flex-col rounded-xl border border-neutral-100 bg-neutral-100 px-3 pt-2 pb-1 text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/60">
                <div className="flex flex-1 items-end gap-2">
                  {totalSalesMonthlyActuals.slice(0, 5).map((value, idx) => (
                    <div
                      key={MONTH_LABELS[idx]}
                      className="flex flex-1 flex-col items-center justify-end gap-1"
                    >
                      <div
                        className="w-full max-w-[18px] rounded-t-md"
                        style={{
                          height: `${(value / Math.max(...totalSalesMonthlyActuals, 1)) * 120}px`,
                          backgroundColor: "#9e8d70",
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* X軸ラベル（枠内の下側に整列） */}
                <div className="mt-1 flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                  {[
                    MONTH_LABELS[0],
                    MONTH_LABELS[1],
                    MONTH_LABELS[2],
                    MONTH_LABELS[3],
                    MONTH_LABELS[4],
                  ].map((label) => (
                    <span key={label} className="flex-1 text-center">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">月別サマリ（サンプル・単位：円）</p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-[11px] dark:border-neutral-700 dark:bg-neutral-900/60">
                <table className="min-w-full border-collapse text-right text-[12px] md:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-[10px] text-neutral-500 dark:border-neutral-800">
                      <th className="py-1 pr-2 text-left">項目</th>
                      {MONTH_LABELS.map((label, i) => (
                        <th key={i} className="py-1 px-1 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">実数値</td>
                      {totalSalesMonthlyActuals.map((v, idx) => (
                        <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                          {v === 0 ? "–" : v.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">月間目標</td>
                      {totalSalesMonthlyTargets.map((v, idx) => (
                        <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                          {v === 0 ? "–" : v.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1 pr-2 text-left text-neutral-500">月間目標達成率</td>
                      {totalSalesMonthlyAchievementRates.map((r, idx) => (
                        <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                          {totalSalesMonthlyActuals[idx] === 0 ? "–" : `${r}%`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 text-left text-neutral-500">累計達成率（年間）</td>
                      {totalSalesMonthlyCumulativeRates.map((r, idx) => (
                        <td key={idx} className="py-1 px-1 font-medium text-neutral-900 dark:text-neutral-50">
                          {totalSalesMonthlyCumulativeActuals[idx] === 0 ? "–" : `${r}%`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
