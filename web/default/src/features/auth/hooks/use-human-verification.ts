import i18next from 'i18next'
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
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useStatus } from '@/hooks/use-status'

import {
  buildHumanVerificationParams,
  resolveHumanVerificationConfig,
} from '../lib/human-verification'
import type { HumanVerificationPayload } from '../types'
import { useAliyunCaptcha } from './use-aliyun-captcha'

export function useHumanVerification() {
  const { status } = useStatus()
  const config = useMemo(() => resolveHumanVerificationConfig(status), [status])
  const [turnstileToken, setTurnstileToken] = useState('')
  const aliyun = useAliyunCaptcha(config.provider === 'aliyun' ? config : null)

  const verify =
    useCallback(async (): Promise<HumanVerificationPayload | null> => {
      if (config.provider === 'none') return {}

      if (config.provider === 'turnstile') {
        if (!turnstileToken) {
          toast.info(
            i18next.t('Please wait a moment, human check is initializing...')
          )
          return null
        }
        return buildHumanVerificationParams('turnstile', turnstileToken)
      }

      if (aliyun.initializationError) {
        toast.error(i18next.t('Human verification failed to initialize'))
        return null
      }
      if (!aliyun.isReady) {
        toast.info(
          i18next.t('Please wait a moment, human check is initializing...')
        )
        return null
      }

      const captchaVerifyParam = await aliyun.verify()
      if (!captchaVerifyParam) return null
      return buildHumanVerificationParams('aliyun', captchaVerifyParam)
    }, [aliyun, config, turnstileToken])

  const isReady =
    config.provider === 'none' ||
    (config.provider === 'turnstile' && Boolean(turnstileToken)) ||
    (config.provider === 'aliyun' &&
      aliyun.isReady &&
      !aliyun.initializationError)

  return {
    config,
    isReady,
    verify,
    turnstileToken,
    setTurnstileToken,
    aliyun,
  }
}

export type HumanVerificationController = ReturnType<
  typeof useHumanVerification
>
