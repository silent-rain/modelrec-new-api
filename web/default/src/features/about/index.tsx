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
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import type { SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { PiScales, PiShieldCheck } from 'react-icons/pi'

import { PublicLayout } from '@/components/layout'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { HomeFooter } from '@/features/home/components'

import { getAboutContent } from './api'

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function PrototypeHeartStraightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 256 256'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M223 57a58.07 58.07 0 0 0-81.92-.1L128 69.05l-13.09-12.19A58 58 0 0 0 33 139l89.35 90.66a8 8 0 0 0 11.4 0L223 139a58 58 0 0 0 0-82m-11.35 70.76L128 212.6l-83.7-84.92a42 42 0 0 1 59.4-59.4l.2.2l18.65 17.35a8 8 0 0 0 10.9 0l18.65-17.35l.2-.2a42 42 0 1 1 59.36 59.44Z' />
    </svg>
  )
}

function PrototypeTrendUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 256 256'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M240 56v64a8 8 0 0 1-16 0V75.31l-82.34 82.35a8 8 0 0 1-11.32 0L96 123.31l-66.34 66.35a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0L136 140.69L212.69 64H168a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8' />
    </svg>
  )
}

function PrototypeLightningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 256 256'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z' />
    </svg>
  )
}

function StyledAboutContent() {
  const { t } = useTranslation()

  const values = [
    {
      key: 'about.values.trust',
      icon: PiShieldCheck,
      accent: '#007B43',
    },
    {
      key: 'about.values.fairness',
      icon: PiScales,
      accent: '#F97316',
    },
    {
      key: 'about.values.altruism',
      icon: PrototypeHeartStraightIcon,
      accent: '#007B43',
    },
    {
      key: 'about.values.upward',
      icon: PrototypeTrendUpIcon,
      accent: '#F97316',
    },
    {
      key: 'about.values.passion',
      icon: PrototypeLightningIcon,
      accent: '#007B43',
    },
  ]

  const sections = [
    { titleKey: 'about.aboutUs', bodyKey: 'about.paragraph1' },
    { titleKey: 'about.vision', bodyKey: 'about.visionDescription' },
    { titleKey: 'about.mission', bodyKey: 'about.missionDescription' },
    { titleKey: 'about.whatWeDo', bodyKey: 'about.whatWeDoDescription' },
  ]

  return (
    <div className='relative min-h-screen'>
      <section className='flex min-h-[400px] items-center justify-center bg-[#FAFAF5] px-6 py-24 md:py-32 dark:bg-[#18140f]'>
        <div className='mx-auto max-w-4xl'>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className='mx-auto max-w-4xl text-center'
          >
            <h1 className='mb-6 text-[38px] leading-tight font-bold tracking-tight text-[#F97316]'>
              {t('about.title')}
            </h1>
            <p className='text-[23px] leading-7 font-medium text-[#F97316]'>
              {t('about.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      <main className='bg-white py-8 md:py-12 dark:bg-[#0f0c0a]'>
        <div className='mx-auto max-w-4xl px-6'>
          <div className='space-y-8'>
            {sections.map((section, idx) => (
              <motion.section
                key={section.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.1 }}
              >
                <h2 className='text-foreground mb-4 border-l-4 border-[#007B43] pl-4 text-2xl leading-8 font-bold tracking-tight dark:border-[#35a16f]'>
                  {t(section.titleKey)}
                </h2>
                <p className='text-muted-foreground text-[15px] leading-8 sm:text-base'>
                  {t(section.bodyKey)}
                </p>
              </motion.section>
            ))}
          </div>
        </div>
      </main>

      <section className='border-t border-[#F3F4F6] bg-[#F9FAFB] pt-2 pb-16 md:pt-4 md:pb-20 dark:border-white/5 dark:bg-[#151a20]'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className='mx-auto max-w-6xl px-6'
        >
          <div className='mb-16 text-center'>
            <h2 className='text-[30px] leading-9 font-bold text-[#F97316]'>
              {t('about.coreValues')}
            </h2>
          </div>

          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
            {values.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.key}
                  className='flex min-h-[168px] flex-col items-center justify-center gap-6 rounded-[12px] bg-white p-8 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-[#1b2028]'
                  style={{ borderTop: `4px solid ${item.accent}` }}
                >
                  <Icon
                    className='h-12 w-12'
                    style={{ color: item.accent }}
                    aria-hidden='true'
                  />
                  <span className='text-lg leading-7 font-bold text-[#111827] dark:text-[#f9fafb]'>
                    {t(item.key)}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </section>

      <HomeFooter />
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['about-content'],
    queryFn: getAboutContent,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isValidUrl(rawContent)
  const isHtml = hasContent && !isUrl && isLikelyHtml(rawContent)

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent) {
    return (
      <PublicLayout showMainContainer={false}>
        <StyledAboutContent />
      </PublicLayout>
    )
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        {/* eslint-disable-next-line react/iframe-missing-sandbox -- Administrator-provided about URLs retain the existing embed contract. */}
        <iframe
          src={rawContent}
          className='h-[calc(100vh-3.5rem)] w-full border-0'
          title={t('About')}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        {isHtml ? (
          <div
            className='prose prose-neutral dark:prose-invert max-w-none'
            // eslint-disable-next-line react/no-danger -- About HTML is administrator-managed, matching the existing content contract.
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />
        ) : (
          <Markdown className='prose-neutral dark:prose-invert max-w-none'>
            {rawContent}
          </Markdown>
        )}
      </div>
    </PublicLayout>
  )
}
