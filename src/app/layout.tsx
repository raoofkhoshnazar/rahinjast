import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "راه اینجاست | مقایسه مسیرهای مهاجرت به آلمان",
  description:
    "راه اینجاست مناسب‌ترین مسیر ویزای آلمان را بر اساس تحصیلات، شغل، زبان و تمکن مالی شما پیشنهاد می‌دهد.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full bg-off-white font-sans text-ink">{children}</body>
    </html>
  );
}
