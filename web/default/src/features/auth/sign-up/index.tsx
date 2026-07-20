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
import { CircleOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'

import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const registrationEnabled =
    status?.register_enabled !== false &&
    status?.password_register_enabled !== false &&
    !status?.self_use_mode_enabled

  return (
    <AuthLayout activeView='sign-up'>
      {registrationEnabled ? (
        <SignUpForm />
      ) : (
        <div className='space-y-6 text-center'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6f8f6] text-[#7b8580] dark:bg-white/6 dark:text-white/65'>
            <CircleOff className='h-6 w-6' aria-hidden='true' />
          </div>
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold'>
              {t('Registration is currently unavailable')}
            </h1>
            <p className='text-muted-foreground text-sm'>
              {t('Please contact the administrator or return to sign in.')}
            </p>
          </div>
          <Link
            to='/sign-in'
            className='sf-btn-primary inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a00]/50'
          >
            {t('Back to sign in')}
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
