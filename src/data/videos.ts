export type VideoSummary = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  tags: string[];
  videoUrl: string;
  summaryImage: string; // public 配下のパス例: "/summary-images/lesson-01.png"
  summaryPoints: string[];
};

export const videos: VideoSummary[] = [
  {
    id: "sec1-002",
    title: "SEEKADメンバー概要と期待役割",
    description:
      "SEEKADの全体像と、シークアドメンバーに期待する役割・スタンスを解説する動画です。",
    durationMinutes: 12,
    tags: ["スタートガイド", "メンバー概要"],
    // TODO: 実際の動画ファイル or 配信URL に差し替えてください
    videoUrl: "/videos/sec1-002.mp4",
    // TODO: 実際に用意したまとめ画像のパスに差し替えてください
    summaryImage: "/summary-images/sec1-002.png",
    summaryPoints: [
      "全体のゴールと、3ヶ月で到達してほしい成長イメージを整理する",
      "シークアドメンバーに期待している役割は『受け身の学習者』ではなく『一緒に成果をつくるパートナー』である",
      "今日からの一歩として、自分がSEEKADで実現したいことを1文で言語化してみる",
    ],
  },
];
