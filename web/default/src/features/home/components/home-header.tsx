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
  Cancel01Icon,
  Menu01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ProfileDropdown } from '@/components/profile-dropdown'
import { HeaderLogo } from '@/components/layout'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { HomeModelSearch } from './home-model-search'

export function HomeHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()
  const { systemName, logo, loading, logoLoaded } = useSystemConfig()
  const { auth } = useAuthStore()
  const navLinks = useTopNavLinks()
  const user = auth.user

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <header className='sticky top-0 z-50 h-[var(--header-height,4rem)] sf-header-transparent backdrop-blur-xl'>
        <nav className='flex h-full items-center gap-8 px-6'>
          <div className='flex shrink-0 items-center gap-1.5'>
            <Link
              to='/'
              className='flex items-center gap-2 text-lg font-bold tracking-tight text-[#ff8700]'
            >
              <HeaderLogo
                src={logo}
                loading={loading}
                logoLoaded={logoLoaded}
                className='size-7 rounded-lg object-contain'
              />
              {systemName || t('AI Routing')}
            </Link>
          </div>

          <div className='hidden min-[1180px]:block'>
            <HomeModelSearch />
          </div>

          <div className='ml-auto hidden min-w-0 flex-1 items-center justify-end gap-0.5 lg:flex'>
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-disabled={link.disabled}
                  tabIndex={link.disabled ? -1 : undefined}
                  className={cn(
                    'dark:text-muted-foreground dark:hover:text-foreground rounded-lg px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-[#374151] transition-colors hover:bg-black/5 hover:text-[#111827] dark:hover:bg-white/10',
                    link.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  {link.title}
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  disabled={link.disabled}
                  className={cn(
                    'dark:text-muted-foreground dark:hover:text-foreground rounded-lg px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-[#374151] transition-colors hover:bg-black/5 hover:text-[#111827] dark:hover:bg-white/10',
                    link.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  {link.title}
                </Link>
              )
            )}
          </div>

          <div className='hidden shrink-0 items-center gap-3 border-l border-[#e5e7eb] pl-4 lg:flex dark:border-white/10'>
            {user && (
              <Link to='/wallet' className='text-right leading-tight'>
                <span className='block text-[10px] font-medium tracking-wide text-[#9ca3af] uppercase'>
                  {t('Balance')}
                </span>
                <span className='block text-xs font-bold text-[#047857]'>
                  {formatQuota(user.quota ?? 0)}
                </span>
              </Link>
            )}

            {!user && (
              <Link
                to='/sign-up'
                className='sf-btn-primary inline-flex h-9 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white'
              >
                {t('Register')}
              </Link>
            )}

            {user ? (
              <ProfileDropdown />
            ) : (
              <Link
                to='/sign-in'
                className='inline-flex h-9 items-center justify-center rounded-lg border border-[#d8d9dd] bg-white px-5 text-sm font-semibold text-[#374151] transition-colors hover:border-[#ff8700] hover:text-[#ff8700] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-[#ff8700] dark:hover:text-[#ff9f33]'
              >
                {t('Sign in')}
              </Link>
            )}
          </div>

          <button
            type='button'
            onClick={() => setMobileOpen((open) => !open)}
            className='sf-home-menu-trigger dark:text-foreground ml-auto size-9 items-center justify-center rounded-lg text-[#111827] transition-colors hover:bg-black/5 dark:hover:bg-white/10'
            aria-label={t('Toggle navigation menu')}
            aria-expanded={mobileOpen}
          >
            <HugeiconsIcon
              icon={mobileOpen ? Cancel01Icon : Menu01Icon}
              className='size-5'
            />
          </button>
        </nav>
      </header>

      <div
        className={cn(
          'fixed inset-x-0 top-[var(--header-height,4rem)] bottom-0 z-40 bg-white px-6 py-8 transition-[opacity,transform] duration-300 dark:bg-[#15141a] lg:hidden',
          mobileOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        )}
      >
        <nav className='flex flex-col gap-1'>
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => setMobileOpen(false)}
                aria-disabled={link.disabled}
                tabIndex={link.disabled ? -1 : undefined}
                className={cn(
                  'dark:text-muted-foreground px-2 py-3 text-center text-base font-medium text-[#374151] transition-colors hover:text-[#ff8700]',
                  link.disabled && 'pointer-events-none opacity-50'
                )}
              >
                {link.title}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                disabled={link.disabled}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'dark:text-muted-foreground px-2 py-3 text-center text-base font-medium text-[#374151] transition-colors hover:text-[#ff8700]',
                  link.disabled && 'pointer-events-none opacity-50'
                )}
              >
                {link.title}
              </Link>
            )
          )}
        </nav>

        <div className='mt-8 grid grid-cols-2 gap-3'>
          <Link
            to='/sign-in'
            onClick={() => setMobileOpen(false)}
            className='dark:bg-card inline-flex h-11 items-center justify-center rounded-xl border border-[#d8d9dd] bg-white text-sm font-semibold'
          >
            {t('Sign in')}
          </Link>
          <Link
            to='/sign-up'
            onClick={() => setMobileOpen(false)}
            className='sf-btn-primary inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-white'
          >
            {t('Register')}
          </Link>
        </div>
      </div>
    </>
  )
}
