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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { LoginMode } from '../lib/login-page-options'

interface LoginModeTabsProps {
  mode: LoginMode
  modes?: LoginMode[]
  onModeChange: (mode: LoginMode) => void
}

const LOGIN_MODES: LoginMode[] = ['sms', 'password']

export function LoginModeTabs(props: LoginModeTabsProps) {
  const { t } = useTranslation()

  return (
    <div
      role='tablist'
      aria-label={t('Authentication navigation')}
      className='flex items-center gap-7'
    >
      {(props.modes ?? LOGIN_MODES).map((mode) => {
        const selected = props.mode === mode
        const label = mode === 'sms' ? t('Phone Login') : t('Password Login')

        return (
          <button
            key={mode}
            type='button'
            role='tab'
            aria-selected={selected}
            onClick={() => props.onModeChange(mode)}
            className={cn(
              'focus-visible:ring-primary/40 h-9 border-b-2 border-transparent text-base transition-colors outline-none focus-visible:ring-2',
              selected
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
