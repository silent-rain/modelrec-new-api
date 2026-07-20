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
import {
  ApiGatewayIcon,
  CloudServerIcon,
  DollarCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

const PLATFORM_FEATURES = [
  {
    title: 'Unified API Interface',
    description:
      'Use one OpenAI-compatible API across providers and switch models with minimal code changes.',
    icon: ApiGatewayIcon,
  },
  {
    title: 'Intelligent Cost Optimization',
    description:
      'Route each request to the best-value model and reduce model costs by up to 40%.',
    icon: DollarCircleIcon,
  },
  {
    title: 'Enterprise-grade High Availability',
    description:
      'Multi-region, multi-provider failover keeps services available with a 99.99% target.',
    icon: CloudServerIcon,
  },
] as const

export function PlatformFeatures() {
  const { t } = useTranslation()

  return (
    <section className='bg-[#f7f7fd] px-6 py-24 dark:bg-[#161720]'>
      <div className='mx-auto max-w-7xl'>
        <div className='text-center'>
          <h2 className='dark:text-foreground text-3xl font-bold tracking-tight text-[#141b2d] md:text-4xl'>
            {t('Platform Core Features')}
          </h2>
          <p className='text-muted-foreground mt-4 text-base md:text-lg'>
            {t('Professional tools for AI development and applications')}
          </p>
        </div>

        <div className='mt-16 grid gap-8 md:grid-cols-3'>
          {PLATFORM_FEATURES.map((feature) => (
            <article
              key={feature.title}
              className='border-border/70 bg-card rounded-2xl border p-8 transition-[translate,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-y-1.5 hover:border-[#ffb45c] hover:shadow-[0_18px_38px_rgba(255,135,0,0.1)]'
            >
              <div className='mb-7 flex size-14 items-center justify-center rounded-2xl bg-[#fff8ef] text-[#ff8700] dark:bg-orange-500/10'>
                <HugeiconsIcon
                  icon={feature.icon}
                  strokeWidth={1.8}
                  className='size-7'
                />
              </div>
              <h3 className='dark:text-foreground text-xl font-bold text-[#141b2d]'>
                {t(feature.title)}
              </h3>
              <p className='text-muted-foreground mt-3 text-sm leading-7'>
                {t(feature.description)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
