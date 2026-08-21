"use client";
import { ELearningCourseView } from "../ELearningCourseView";

// コールフォース（自動AI架電サービス）の商談動画アーカイブ。
// サービスの4機能（受電 / 3点確認 / 即電 / AI架電）をセクションとして並べ、
// 商談録音をそれぞれの機能に紐づけて保存する。
const CALLFORCE_SECTIONS = {
  1: {
    title: "業務効率化（AI業務改善）",
    description:
      "事務・経理・現場業務などのAI自動化・業務効率化に関するヒアリング商談記録。",
  },
  2: {
    title: "AI架電",
    description: "AI音声による自動架電に関する商談記録。",
  },
  3: {
    title: "受電",
    description: "入電対応・営業電話フィルタリング・取次など、受電業務に関する商談記録。",
  },
  4: {
    title: "3点確認（起床・出発・出勤確認）",
    description: "派遣スタッフの起床・出発・出勤確認を代行する3点確認に関する商談記録。",
  },
  5: {
    title: "即電",
    description: "即時の折り返し架電（即電）に関する商談記録。",
  },
} as const;

export default function CallforcePage() {
  return (
    <ELearningCourseView
      courseId="callforce"
      courseTitle="コールフォース（商談記録）"
      courseSubtitle="コールフォースの各機能ごとに、これまでの商談動画をアーカイブとして保存しています。"
      sections={CALLFORCE_SECTIONS}
      lockSections={false}
    />
  );
}
