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
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
  activeView?: 'sign-in' | 'sign-up'
  showRegister?: boolean
}

export function AuthLayout({
  children,
  activeView,
  showRegister = true,
}: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const highlights = [
    t('100+ mainstream AI models, ready to use'),
    t('60+ leading model providers worldwide'),
    t('400T+ monthly token throughput'),
  ]

  return (
    <main className='flex min-h-svh items-center justify-center bg-[#f5f6f3] px-4 py-4 sm:px-6 sm:py-6 dark:bg-[#151713]'>
      <div className='grid w-full max-w-[1120px] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:min-h-[680px] lg:grid-cols-2 dark:border-white/10 dark:bg-[#20231f]'>
        <aside className='relative hidden overflow-hidden bg-[#087f45] p-12 text-white lg:flex lg:flex-col'>
          <Link
            to='/'
            className='flex w-fit items-center gap-3 rounded-[12px] transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-white/80'
          >
            <div className='relative h-10 w-10 overflow-hidden rounded-xl bg-white p-1.5'>
              {loading ? (
                <Skeleton className='absolute inset-0 rounded-xl' />
              ) : (
                <img
                  src={logo}
                  alt={t('Logo')}
                  className='h-full w-full rounded-lg object-cover'
                />
              )}
            </div>
            {loading ? (
              <Skeleton className='h-7 w-32 bg-white/20' />
            ) : (
              <span className='text-2xl font-semibold tracking-tight'>
                {systemName}
              </span>
            )}
          </Link>

          <div className='mt-12 max-w-[390px]'>
            <h1 className='text-[38px] leading-[1.16] font-semibold tracking-[-0.03em]'>
              {t('One interface,')}
              <br />
              {t('Infinite possibilities')}
            </h1>
            <p className='mt-5 text-lg leading-8 text-white/84'>
              {t(
                'Connect leading AI models through one unified integration platform.'
              )}
            </p>

            <ul
              className='mt-10 space-y-6'
              aria-label={t('Platform highlights')}
            >
              {highlights.map((highlight) => (
                <li
                  key={highlight}
                  className='flex items-center gap-3 text-base text-white/92'
                >
                  <span className='flex h-6 w-6 items-center justify-center rounded-full bg-white/14'>
                    <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className='mt-auto pt-10 text-sm text-white/62'>
            © {new Date().getFullYear()} {systemName}.{' '}
            {t('All rights reserved.')}
          </p>
        </aside>

        <section className='flex min-h-[620px] flex-col bg-white px-6 py-8 sm:px-10 sm:py-10 lg:min-h-0 lg:px-16 lg:py-16 dark:bg-[#20231f]'>
          <Link
            to='/'
            className='focus-visible:ring-primary mb-8 w-fit rounded-lg transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 lg:hidden'
          >
            <span className='flex items-center gap-2'>
              <span className='relative h-9 w-9 overflow-hidden rounded-lg bg-white p-1 shadow-sm dark:bg-white'>
                {loading ? (
                  <Skeleton className='absolute inset-0 rounded-lg' />
                ) : (
                  <img
                    src={logo}
                    alt={t('Logo')}
                    className='h-full w-full rounded-md object-cover'
                  />
                )}
              </span>
              <span className='text-lg font-semibold'>{systemName}</span>
            </span>
          </Link>

          {activeView ? (
            <nav
              className='auth-tab-switcher mb-10 flex h-11 items-start gap-8 border-b border-[#edf0ec] dark:border-white/10'
              aria-label={t('Authentication navigation')}
            >
              <Link
                to='/sign-in'
                aria-current={activeView === 'sign-in' ? 'page' : undefined}
                className={`focus-visible:ring-primary/60 relative h-11 px-0.5 text-base font-semibold transition-colors outline-none focus-visible:ring-2 ${
                  activeView === 'sign-in'
                    ? 'text-[#ff8a00]'
                    : 'hover:text-foreground text-[#8b9490]'
                }`}
              >
                {t('Sign in')}
                {activeView === 'sign-in' ? (
                  <span className='absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-[#ff8a00]' />
                ) : null}
              </Link>
              {showRegister || activeView === 'sign-up' ? (
                <Link
                  to='/sign-up'
                  aria-current={activeView === 'sign-up' ? 'page' : undefined}
                  className={`focus-visible:ring-primary/60 relative h-11 px-0.5 text-base font-semibold transition-colors outline-none focus-visible:ring-2 ${
                    activeView === 'sign-up'
                      ? 'text-[#ff8a00]'
                      : 'hover:text-foreground text-[#8b9490]'
                  }`}
                >
                  {t('Sign up')}
                  {activeView === 'sign-up' ? (
                    <span className='absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-[#ff8a00]' />
                  ) : null}
                </Link>
              ) : null}
            </nav>
          ) : null}

          <div
            className={`flex flex-1 justify-center ${
              activeView === 'sign-up'
                ? 'items-start pt-4 sm:pt-6'
                : 'items-start pt-8 sm:pt-10 lg:pt-14'
            }`}
          >
            <div className='w-full max-w-[470px]'>{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
