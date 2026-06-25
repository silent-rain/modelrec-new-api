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
import i18next from 'i18next'
import { toast } from 'sonner'
import { useCountdown } from '@/hooks/use-countdown'
import { sendSmsCode } from '../api'
import { SMS_VERIFICATION_COUNTDOWN } from '../constants'

interface UseSmsVerificationOptions {
  turnstileToken?: string
  validateTurnstile?: () => boolean
}

/**
 * Hook for managing SMS verification code sending
 */
export function useSmsVerification(options?: UseSmsVerificationOptions) {
  const [isSending, setIsSending] = useState(false)
  const {
    secondsLeft,
    isActive,
    start: startCountdown,
  } = useCountdown({ initialSeconds: SMS_VERIFICATION_COUNTDOWN })

  /**
   * Send verification code to phone
   */
  const sendCode = async (phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error(i18next.t('Please enter your phone number first'))
      return false
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phoneNumber)) {
      toast.error(i18next.t('Please enter a valid phone number'))
      return false
    }

    // Validate turnstile if validation function is provided
    if (options?.validateTurnstile && !options.validateTurnstile()) {
      return false
    }

    setIsSending(true)
    try {
      const res = await sendSmsCode(phoneNumber, undefined, undefined, options?.turnstileToken)
      // 后端返回 {code:0, message:"ok", data:{success:true, message:"..."}}
      // 以 code===0 为成功判定，同时兼容 {success:true} 格式
      const isSuccess = res?.code === 0 || res?.success === true
      if (isSuccess) {
        startCountdown()
        toast.success(i18next.t('SMS verification code sent'))
        return true
      }
      toast.error(
        res?.message || res?.data?.message || i18next.t('Failed to send SMS verification code')
      )
      return false
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.data?.message ||
        error?.message ||
        i18next.t('Failed to send SMS verification code')
      toast.error(msg)
      return false
    } finally {
      setIsSending(false)
    }

  }

  return {
    isSending,
    secondsLeft,
    isActive,
    sendCode,
  }
}