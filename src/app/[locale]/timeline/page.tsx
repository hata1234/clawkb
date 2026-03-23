import { setRequestLocale } from "next-intl/server";
import TimelineFeed from "@/components/TimelineFeed";

export const metadata = {
  title: "Timeline — ClawKB",
};

export default async function TimelinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TimelineFeed />;
}
