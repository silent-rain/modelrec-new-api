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
export const ALIYUN_CAPTCHA_SCRIPT_URL =
  'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'

export type AliyunCaptchaInstance = {
  show: () => void
  hide: () => void
}

export type AliyunCaptchaError = {
  code?: string
  msg?: string
}

export type AliyunCaptchaInitOptions = {
  SceneId: string
  mode: 'popup'
  element: string
  button: string
  language: string
  success: (captchaVerifyParam: string) => void
  fail?: (result: unknown) => void
  getInstance: (instance: AliyunCaptchaInstance) => void
  onError?: (error: AliyunCaptchaError) => void
  onClose?: (reason: string) => void
  slideStyle: { width: number; height: number }
}

type BuildAliyunCaptchaOptions = {
  sceneId: string
  elementId: string
  buttonId: string
  language: string
  success: AliyunCaptchaInitOptions['success']
  fail: NonNullable<AliyunCaptchaInitOptions['fail']>
  getInstance: AliyunCaptchaInitOptions['getInstance']
  onError: NonNullable<AliyunCaptchaInitOptions['onError']>
  onClose: NonNullable<AliyunCaptchaInitOptions['onClose']>
}

declare global {
  interface Window {
    AliyunCaptchaConfig?: {
      region: 'cn' | 'sgp'
      prefix: string
    }
    initAliyunCaptcha?: (options: AliyunCaptchaInitOptions) => void
  }
}

let scriptLoadPromise: Promise<void> | null = null

export function buildAliyunCaptchaInitOptions({
  sceneId,
  elementId,
  buttonId,
  language,
  success,
  fail,
  getInstance,
  onError,
  onClose,
}: BuildAliyunCaptchaOptions): AliyunCaptchaInitOptions {
  return {
    SceneId: sceneId,
    mode: 'popup',
    element: `#${elementId}`,
    button: `#${buttonId}`,
    language,
    success,
    fail,
    getInstance,
    onError,
    onClose,
    slideStyle: { width: 360, height: 40 },
  }
}

export function loadAliyunCaptchaScript(config: {
  region: 'cn' | 'sgp'
  prefix: string
}): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Aliyun Captcha requires a browser'))
  }

  window.AliyunCaptchaConfig = config
  if (window.initAliyunCaptcha) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${ALIYUN_CAPTCHA_SCRIPT_URL}"]`
    )
    const script = existingScript ?? document.createElement('script')

    const handleLoad = () => {
      if (window.initAliyunCaptcha) {
        resolve()
        return
      }
      scriptLoadPromise = null
      reject(new Error('Aliyun Captcha SDK did not initialize'))
    }
    const handleError = () => {
      scriptLoadPromise = null
      reject(new Error('Failed to load Aliyun Captcha SDK'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existingScript) {
      script.src = ALIYUN_CAPTCHA_SCRIPT_URL
      script.async = true
      document.head.appendChild(script)
    }
  })

  return scriptLoadPromise
}

export function createAliyunCaptchaController() {
  let instance: AliyunCaptchaInstance | null = null
  let verifiedParam = ''
  let pending:
    | {
        promise: Promise<string | null>
        resolve: (value: string | null) => void
      }
    | undefined

  return {
    bindInstance(nextInstance: AliyunCaptchaInstance) {
      instance = nextInstance
    },
    verify(): Promise<string | null> {
      if (verifiedParam) return Promise.resolve(verifiedParam)
      if (!instance) return Promise.resolve(null)
      if (pending) return pending.promise

      let resolvePending: (value: string | null) => void = () => undefined
      const promise = new Promise<string | null>((resolve) => {
        resolvePending = resolve
      })
      pending = { promise, resolve: resolvePending }
      instance.show()
      return promise
    },
    succeed(captchaVerifyParam: string) {
      verifiedParam = captchaVerifyParam
      pending?.resolve(captchaVerifyParam)
      pending = undefined
    },
    cancel() {
      pending?.resolve(null)
      pending = undefined
    },
  }
}
