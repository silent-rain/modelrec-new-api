import { Eye, EyeOff, Lock } from 'lucide-react'
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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { AUTH_INPUT_CLASS } from '@/features/auth/components/auth-form-styles'
import { cn } from '@/lib/utils'

type AuthPasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  showLeadingIcon?: boolean
}

export function AuthPasswordInput({
  className,
  disabled,
  showLeadingIcon,
  ...props
}: AuthPasswordInputProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const toggleLabel = isVisible ? t('Hide password') : t('Show password')
  const leadingIconVisible = showLeadingIcon ?? true

  return (
    <div className='relative'>
      {leadingIconVisible ? (
        <Lock
          className='pointer-events-none absolute top-1/2 left-4 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#a6afab] dark:text-white/55'
          aria-hidden='true'
        />
      ) : null}
      <Input
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
        className={cn(
          AUTH_INPUT_CLASS,
          leadingIconVisible ? 'pr-12' : 'px-4 pr-12',
          className
        )}
        {...props}
      />
      <button
        type='button'
        disabled={disabled}
        onClick={() => setIsVisible((current) => !current)}
        className='hover:text-foreground absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#89928e] transition-colors outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#ff8a00]/50 disabled:pointer-events-none disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/8'
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {isVisible ? (
          <Eye className='h-[18px] w-[18px]' aria-hidden='true' />
        ) : (
          <EyeOff className='h-[18px] w-[18px]' aria-hidden='true' />
        )}
      </button>
    </div>
  )
}
