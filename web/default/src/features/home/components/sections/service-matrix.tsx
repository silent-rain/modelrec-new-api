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
  AiMagicIcon,
  ChartEvaluationIcon,
  News01Icon,
  Rocket01Icon,
  Route01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const SERVICES = [
  {
    title: 'Information',
    description: 'Track global AI model updates and industry news',
    icon: News01Icon,
    featured: false,
  },
  {
    title: 'Recommendation',
    description: 'Recommend the best model for each user scenario',
    icon: AiMagicIcon,
    featured: false,
  },
  {
    title: 'Evaluation',
    description: 'Compare model quality across multiple dimensions',
    icon: ChartEvaluationIcon,
    featured: true,
  },
  {
    title: 'Routing',
    description: 'Automatically route requests to the best model service',
    icon: Route01Icon,
    featured: false,
  },
  {
    title: 'Distribution',
    description: 'Connect one API and ship models into your product',
    icon: Rocket01Icon,
    featured: false,
  },
] as const

export function ServiceMatrix() {
  const { t } = useTranslation()

  return (
    <section className='bg-[#f9f7f2] px-6 py-24 dark:bg-[#191815]'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='dark:text-foreground text-3xl font-bold tracking-tight text-[#111827]'>
              {t('AI model service matrix')}
            </h2>
            <p className='text-muted-foreground mt-3 text-base'>
              {t('From discovery to delivery, one-stop AI model services')}
            </p>
          </div>
          <Link
            to='/pricing'
            className='text-sm font-semibold text-[#ff8700] transition-colors hover:text-[#e97700]'
          >
            {t('Model Square')} →
          </Link>
        </div>

        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-5'>
          {SERVICES.map((service) => (
            <article
              key={service.title}
              className={cn(
                'bg-card min-h-56 rounded-3xl border border-transparent p-8 shadow-[0_8px_28px_rgba(15,23,42,0.025)] transition-[translate,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-y-1.5 hover:border-[#ffb45c] hover:shadow-[0_18px_38px_rgba(255,135,0,0.12)]',
                service.featured &&
                  'border-[#91d2b7] bg-[#effaf3] hover:border-[#39a878] dark:bg-emerald-950/20'
              )}
            >
              <div className='mb-7 flex size-14 items-center justify-center rounded-2xl bg-[#fff8ef] text-[#ff8a00] dark:bg-orange-500/10'>
                <HugeiconsIcon
                  icon={service.icon}
                  strokeWidth={1.8}
                  className={cn('size-7', service.featured && 'text-[#00865b]')}
                />
              </div>
              <h3
                className={cn(
                  'text-xl font-bold text-[#141b2d] dark:text-foreground',
                  service.featured && 'text-[#00865b]'
                )}
              >
                {t(service.title)}
              </h3>
              <p className='text-muted-foreground mt-3 text-sm leading-7'>
                {t(service.description)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
