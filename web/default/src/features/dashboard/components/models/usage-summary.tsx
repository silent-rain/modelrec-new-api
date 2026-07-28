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
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChartNoAxesCombined, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

export function UsageSummary() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)

  return (
    <section
      aria-label={t('Usage Information')}
      className='bg-card overflow-hidden rounded-xl border shadow-xs'
    >
      <div className='divide-border/70 grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0'>
        <article className='relative min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5'>
          <div
            aria-hidden='true'
            className='bg-primary/8 absolute -top-12 -right-10 size-32 rounded-full blur-2xl'
          />
          <div className='relative flex min-w-0 items-start justify-between gap-4'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg'>
                  <WalletCards className='size-3.5' aria-hidden='true' />
                </span>
                <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                  {t('Top-up Balance')}
                </span>
              </div>
              <div
                className='text-foreground mt-3 truncate font-mono text-2xl font-bold tracking-tight tabular-nums sm:text-3xl'
                title={formatQuota(user?.quota ?? 0)}
              >
                {formatQuota(user?.quota ?? 0)}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                {t('Remaining quota')}
              </p>
            </div>

            <Button
              size='sm'
              className='relative mt-0.5'
              render={<Link to='/wallet' />}
            >
              <span>{t('Recharge')}</span>
              <ArrowRight data-icon='inline-end' />
            </Button>
          </div>
        </article>

        <article className='relative min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5'>
          <div
            aria-hidden='true'
            className='bg-muted absolute -right-8 -bottom-14 size-36 rounded-full blur-2xl'
          />
          <div className='relative min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg'>
                <ChartNoAxesCombined className='size-3.5' aria-hidden='true' />
              </span>
              <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                {t('Cumulative Consumption')}
              </span>
            </div>
            <div
              className='text-foreground mt-3 truncate font-mono text-2xl font-bold tracking-tight tabular-nums sm:text-3xl'
              title={formatQuota(user?.used_quota ?? 0)}
            >
              {formatQuota(user?.used_quota ?? 0)}
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t('Total consumed quota')}
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
