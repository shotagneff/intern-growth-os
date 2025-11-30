import { notFound } from "next/navigation";
import Image from "next/image";
import { videos, type VideoSummary } from "../../../data/videos";

interface PageProps {
  params: { id: string };
}

export default function VideoDetailPage({ params }: PageProps) {
  const video = videos.find((v: VideoSummary) => v.id === params.id);

  if (!video) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6 md:py-8">
        {/* 左カラム: 動画プレイヤー＋基本情報 */}
        <section className="flex-1 space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-black shadow-sm dark:border-neutral-800">
            <video
              className="h-full w-full"
              controls
              src={video.videoUrl}
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-semibold md:text-xl">{video.title}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {video.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800">
                約{video.durationMinutes}分
              </span>
              {video.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 右カラム: まとめカード */}
        <aside className="w-full max-w-md space-y-3 md:w-80">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                今日のまとめ
              </h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                1枚で復習
              </span>
            </div>

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
                className="inline-flex flex-1 items-center justify-center rounded-md bg-neutral-900 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                まとめ画像を拡大
              </button>
              <a
                href={video.summaryImage}
                download
                className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                画像を保存
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
