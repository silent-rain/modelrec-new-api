/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, Heart, Scale, ShieldCheck, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLayout } from "@/components/layout";
import { getAboutContent } from "./api";

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function HeroBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-primary-foreground"
      preserveAspectRatio="none"
      viewBox="0 0 1440 320"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points="1200,0 1440,0 1440,220"
        fill="currentColor"
        opacity="0.10"
      />
      <polygon
        points="1050,0 1280,0 1180,180"
        fill="currentColor"
        opacity="0.08"
      />
      <polygon
        points="900,320 1200,320 1100,160"
        fill="currentColor"
        opacity="0.06"
      />
      <polygon
        points="0,320 360,320 180,200"
        fill="currentColor"
        opacity="0.05"
      />
      <circle cx="160" cy="80" r="60" fill="currentColor" opacity="0.08" />
      <circle cx="1300" cy="260" r="90" fill="currentColor" opacity="0.06" />
    </svg>
  );
}

function StyledAboutContent() {
  const { t } = useTranslation();

  const values = [
    { key: "about.values.trust", icon: ShieldCheck },
    { key: "about.values.fairness", icon: Scale },
    { key: "about.values.altruism", icon: Heart },
    { key: "about.values.upward", icon: ArrowUpRight },
    { key: "about.values.passion", icon: Zap },
  ];

  const sections = [
    { titleKey: "about.aboutUs", bodyKey: "about.paragraph1" },
    { titleKey: "about.mission", bodyKey: "about.paragraph2" },
    { titleKey: "about.coverage", bodyKey: "about.paragraph3" },
  ];

  return (
    <div className="relative min-h-screen bg-background font-['Inter','Noto_Sans_SC',system-ui,sans-serif]">
      {/* ---------- 顶部企业横幅 ---------- */}
      <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground sm:py-24 lg:py-28">
        <HeroBackground />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-3xl font-bold leading-tight tracking-wide sm:text-4xl md:text-4xl">
              {t("about.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed opacity-85 sm:text-lg">
              {t("about.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------- 正文内容 ---------- */}
      <main className="container mx-auto max-w-4xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        {/* 关于我们 / 使命 / 能力覆盖 — 直接铺在背景上，无卡片包裹 */}
        <div className="space-y-10">
          {sections.map((section, idx) => (
            <motion.section
              key={section.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + idx * 0.1 }}
            >
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
                {t(section.titleKey)}
              </h2>
              <p className="text-base leading-[1.8] text-muted-foreground">
                {t(section.bodyKey)}
              </p>
            </motion.section>
          ))}
        </div>

        {/* 核心价值观 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-14 rounded-2xl bg-muted px-6 py-10 sm:px-10 sm:py-12"
        >
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            {t("about.coreValues")}
          </h2>
          {/* <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
            {t("about.weBelieve")}
          </p> */}

          <div className="flex flex-nowrap items-center justify-center gap-4 sm:gap-8 md:gap-12 mt-8">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t(item.key)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

export function About() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["about-content"],
    queryFn: getAboutContent,
  });

  const rawContent = data?.data?.trim() ?? "";
  const hasContent = rawContent.length > 0;
  const isUrl = hasContent && isValidUrl(rawContent);
  const isHtml = hasContent && !isUrl && isLikelyHtml(rawContent);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto flex max-w-4xl flex-col gap-4 py-12">
          <Skeleton className="h-8 w-[45%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
      </PublicLayout>
    );
  }

  if (!hasContent) {
    return (
      <PublicLayout showMainContainer={false}>
        <StyledAboutContent />
      </PublicLayout>
    );
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        <iframe
          src={rawContent}
          className="h-[calc(100vh-3.5rem)] w-full border-0"
          title={t("About")}
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {isHtml ? (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />
        ) : (
          <Markdown className="prose-neutral dark:prose-invert max-w-none">
            {rawContent}
          </Markdown>
        )}
      </div>
    </PublicLayout>
  );
}
