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
import { describe, expect, test } from 'bun:test'

import {
  ALIYUN_CAPTCHA_SCRIPT_URL,
  buildAliyunCaptchaInitOptions,
  createAliyunCaptchaController,
} from '../src/features/auth/lib/aliyun-captcha'
import {
  buildHumanVerificationParams,
  resolveHumanVerificationConfig,
} from '../src/features/auth/lib/human-verification'

describe('resolveHumanVerificationConfig', () => {
  test('uses Aliyun when the Go status exposes a complete configuration', () => {
    expect(
      resolveHumanVerificationConfig({
        human_verification_provider: 'aliyun',
        aliyun_captcha_enabled: true,
        aliyun_captcha_region: 'cn',
        aliyun_captcha_prefix: 'captcha-prefix',
        aliyun_captcha_scene_id: 'scene-login',
        turnstile_check: true,
        turnstile_site_key: 'turnstile-key',
      })
    ).toEqual({
      provider: 'aliyun',
      region: 'cn',
      prefix: 'captcha-prefix',
      sceneId: 'scene-login',
    })
  })

  test('fails closed when Go selects Aliyun but its public configuration is incomplete', () => {
    expect(
      resolveHumanVerificationConfig({
        human_verification_provider: 'aliyun',
        aliyun_captcha_enabled: true,
        aliyun_captcha_region: 'cn',
        aliyun_captcha_prefix: '',
        aliyun_captcha_scene_id: 'scene-login',
        turnstile_check: true,
        turnstile_site_key: 'turnstile-key',
      })
    ).toEqual({ provider: 'none' })
  })

  test('keeps Turnstile compatibility for legacy status responses', () => {
    expect(
      resolveHumanVerificationConfig({
        turnstile_check: true,
        turnstile_site_key: 'turnstile-key',
      })
    ).toEqual({ provider: 'turnstile', siteKey: 'turnstile-key' })
  })
})

describe('buildHumanVerificationParams', () => {
  test('passes the Aliyun verification parameter without modification', () => {
    expect(
      buildHumanVerificationParams('aliyun', 'raw-captcha-verify-param')
    ).toEqual({ captcha_verify_param: 'raw-captcha-verify-param' })
  })

  test('keeps the existing Turnstile query parameter', () => {
    expect(
      buildHumanVerificationParams('turnstile', 'turnstile-token')
    ).toEqual({ turnstile: 'turnstile-token' })
  })
})

describe('buildAliyunCaptchaInitOptions', () => {
  test('uses the configured scene and scoped form element ids', () => {
    const success = () => undefined
    const fail = () => undefined
    const getInstance = () => undefined
    const onError = () => undefined
    const onClose = () => undefined

    expect(
      buildAliyunCaptchaInitOptions({
        sceneId: 'scene-login',
        elementId: 'captcha-element-auth',
        buttonId: 'captcha-button-auth',
        language: 'cn',
        success,
        fail,
        getInstance,
        onError,
        onClose,
      })
    ).toMatchObject({
      SceneId: 'scene-login',
      mode: 'popup',
      element: '#captcha-element-auth',
      button: '#captcha-button-auth',
      language: 'cn',
      success,
      fail,
      getInstance,
      onError,
      onClose,
    })
    expect(ALIYUN_CAPTCHA_SCRIPT_URL).toBe(
      'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'
    )
  })

  test('opens the challenge once and reuses the verified parameter', async () => {
    let showCalls = 0
    const controller = createAliyunCaptchaController()
    controller.bindInstance({
      show: () => {
        showCalls += 1
      },
      hide: () => undefined,
    })

    const pendingVerification = controller.verify()
    controller.succeed('raw-captcha-verify-param')

    expect(await pendingVerification).toBe('raw-captcha-verify-param')
    expect(await controller.verify()).toBe('raw-captcha-verify-param')
    expect(showCalls).toBe(1)
  })
})
