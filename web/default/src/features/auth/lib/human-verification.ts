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
import type {
  HumanVerificationPayload,
  HumanVerificationProvider,
  SystemStatus,
} from '../types'

export type HumanVerificationConfig =
  | { provider: 'none' }
  | { provider: 'turnstile'; siteKey: string }
  | {
      provider: 'aliyun'
      region: 'cn' | 'sgp'
      prefix: string
      sceneId: string
    }

function getStatusValue<T>(
  status: SystemStatus | null | undefined,
  key: string
): T | undefined {
  if (!status) return undefined
  const directValue = status[key]
  if (directValue !== undefined) return directValue as T
  return status.data?.[key] as T | undefined
}

export function resolveHumanVerificationConfig(
  status: SystemStatus | null | undefined
): HumanVerificationConfig {
  const selectedProvider = getStatusValue<HumanVerificationProvider>(
    status,
    'human_verification_provider'
  )

  if (selectedProvider === 'none') return { provider: 'none' }

  if (
    selectedProvider === 'aliyun' ||
    (!selectedProvider &&
      getStatusValue<boolean>(status, 'aliyun_captcha_enabled'))
  ) {
    const enabled = getStatusValue<boolean>(status, 'aliyun_captcha_enabled')
    const region = getStatusValue<string>(status, 'aliyun_captcha_region')
    const prefix = getStatusValue<string>(
      status,
      'aliyun_captcha_prefix'
    )?.trim()
    const sceneId = getStatusValue<string>(
      status,
      'aliyun_captcha_scene_id'
    )?.trim()

    if (enabled && (region === 'cn' || region === 'sgp') && prefix && sceneId) {
      return { provider: 'aliyun', region, prefix, sceneId }
    }
    return { provider: 'none' }
  }

  const turnstileEnabled = getStatusValue<boolean>(status, 'turnstile_check')
  const turnstileSiteKey = getStatusValue<string>(
    status,
    'turnstile_site_key'
  )?.trim()
  if (
    (selectedProvider === 'turnstile' || !selectedProvider) &&
    turnstileEnabled &&
    turnstileSiteKey
  ) {
    return { provider: 'turnstile', siteKey: turnstileSiteKey }
  }

  return { provider: 'none' }
}

export function buildHumanVerificationParams(
  provider: HumanVerificationProvider,
  token: string
): HumanVerificationPayload {
  if (provider === 'aliyun') {
    return { captcha_verify_param: token }
  }
  if (provider === 'turnstile') {
    return { turnstile: token }
  }
  return {}
}
