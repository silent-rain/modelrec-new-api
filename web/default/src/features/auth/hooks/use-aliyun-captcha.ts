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
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  buildAliyunCaptchaInitOptions,
  createAliyunCaptchaController,
  loadAliyunCaptchaScript,
} from '../lib/aliyun-captcha'
import type { HumanVerificationConfig } from '../lib/human-verification'

type AliyunConfig = Extract<HumanVerificationConfig, { provider: 'aliyun' }>

export function useAliyunCaptcha(config: AliyunConfig | null) {
  const reactId = useId().replaceAll(/[^a-zA-Z0-9_-]/g, '')
  const elementId = `aliyun-captcha-element-${reactId}`
  const buttonId = `aliyun-captcha-button-${reactId}`
  const controllerRef = useRef<
    ReturnType<typeof createAliyunCaptchaController> | undefined
  >(undefined)
  if (!controllerRef.current) {
    controllerRef.current = createAliyunCaptchaController()
  }

  const [isReady, setIsReady] = useState(config === null)
  const [initializationError, setInitializationError] = useState('')

  useEffect(() => {
    const controller = controllerRef.current
    if (!config || !controller) {
      setIsReady(true)
      setInitializationError('')
      return
    }

    let disposed = false
    setIsReady(false)
    setInitializationError('')

    loadAliyunCaptchaScript({ region: config.region, prefix: config.prefix })
      .then(() => {
        if (disposed || !window.initAliyunCaptcha) return
        window.initAliyunCaptcha(
          buildAliyunCaptchaInitOptions({
            sceneId: config.sceneId,
            elementId,
            buttonId,
            language: i18next.language.startsWith('zh') ? 'cn' : 'en',
            success: (captchaVerifyParam) => {
              controller.succeed(captchaVerifyParam)
            },
            fail: () => {
              // The SDK refreshes the active challenge automatically.
            },
            getInstance: (instance) => {
              controller.bindInstance(instance)
              if (!disposed) setIsReady(true)
            },
            onError: (error) => {
              controller.cancel()
              if (!disposed) {
                setInitializationError(
                  error.msg ||
                    error.code ||
                    'Aliyun Captcha initialization failed'
                )
              }
            },
            onClose: (reason) => {
              if (reason === 'userDismiss') controller.cancel()
            },
          })
        )
      })
      .catch((error: unknown) => {
        controller.cancel()
        if (!disposed) {
          setInitializationError(
            error instanceof Error
              ? error.message
              : 'Aliyun Captcha initialization failed'
          )
        }
      })

    return () => {
      disposed = true
      controller.cancel()
    }
  }, [buttonId, config, elementId])

  const verify = useCallback(() => {
    return controllerRef.current?.verify() ?? Promise.resolve(null)
  }, [])

  return {
    elementId,
    buttonId,
    isReady,
    initializationError,
    verify,
  }
}
