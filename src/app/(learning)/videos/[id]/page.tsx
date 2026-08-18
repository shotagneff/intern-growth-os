import { notFound } from "next/navigation";
import Image from "next/image";
import { videos, type VideoSummary } from "../../../../data/videos";
import { PAGE_MAIN, PAGE_INNER, PANEL, PageHeader, SectionCard, MAIN_COLOR } from "@/components/panel";

interface PageProps {
  params: { id: string };
}

export default function VideoDetailPage({ params }: PageProps) {
  const video = videos.find((v: VideoSummary) => v.id === params.id);

  if (!video) {
    notFound();
  }

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="Learning Hub"
          title={video.title}
          description={video.description}
        />

        <div className="flex flex-col gap-6 md:flex-row">
          {/* 左カラム: 動画プレイヤー＋基本情報 */}
          <section className="flex-1 space-y-4">
            <div className={`${PANEL} overflow-hidden`}>
              <div className="aspect-video w-full bg-black">
                <video className="h-full w-full" controls src={video.videoUrl} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 dark:bg-neutral-800">
                約{video.durationMinutes}分
              </span>
              {video.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 dark:bg-neutral-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* 右カラム: まとめカード */}
          <aside className="w-full md:w-80 md:max-w-md">
            <SectionCard
              title="今日のまとめ"
              action={
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  1枚で復習
                </span>
              }
            >
              <div className="relative mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                <Image
                  src={video.summaryImage}
                  alt={`${video.title} のまとめ画像`}
                  width={640}
                  height={360}
                  className="h-auto w-full cursor-pointer object-cover transition-transform duration-200 hover:scale-[1.02]"
                />
              </div>

              <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                この動画で覚えておきたいポイント
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-4 text-[11px] text-neutral-700 dark:text-neutral-200">
                {video.summaryPoints.map((point: string, idx: number) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
                  style={{ backgroundColor: MAIN_COLOR }}
                >
                  まとめ画像を拡大
                </button>
                <a
                  href={video.summaryImage}
                  download
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  画像を保存
                </a>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
