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
  isValidMainlandChinaPhone,
  registerFormSchema,
} from '../src/features/auth/constants'
import { resolveAuthRedirect } from '../src/features/auth/lib/redirect'
import { buildRegisterPayload } from '../src/features/auth/lib/registration'

const validPhoneRegistration = {
  registrationMethod: 'phone' as const,
  username: 'demo_user',
  phone: '13800138000',
  email: '',
  verification_code: '123456',
  password: 'password123',
  confirmPassword: 'password123',
}

const validEmailRegistration = {
  registrationMethod: 'email' as const,
  username: 'demo_user',
  phone: '',
  email: 'demo@example.com',
  verification_code: '123456',
  password: 'password123',
  confirmPassword: 'password123',
}

describe('registerFormSchema', () => {
  test('requires password confirmation', () => {
    const result = registerFormSchema.safeParse({
      ...validPhoneRegistration,
      confirmPassword: '',
    })

    expect(result.success).toBe(false)
  })

  test('rejects mismatched passwords', () => {
    const result = registerFormSchema.safeParse({
      ...validPhoneRegistration,
      confirmPassword: 'different123',
    })

    expect(result.success).toBe(false)
  })

  test('accepts a complete phone registration', () => {
    const result = registerFormSchema.safeParse(validPhoneRegistration)

    expect(result.success).toBe(true)
  })

  test('accepts a complete email registration', () => {
    expect(registerFormSchema.safeParse(validEmailRegistration).success).toBe(
      true
    )
  })

  test('requires an email only in email registration mode', () => {
    const result = registerFormSchema.safeParse({
      ...validEmailRegistration,
      email: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('buildRegisterPayload', () => {
  const verification = { captcha_verify_param: 'captcha-param' }

  test('submits only the phone identity in phone mode', () => {
    expect(
      buildRegisterPayload(validPhoneRegistration, 'AFF123', verification)
    ).toEqual({
      username: 'demo_user',
      phone: '13800138000',
      verification_code: '123456',
      password: 'password123',
      aff_code: 'AFF123',
      captcha_verify_param: 'captcha-param',
    })
  })

  test('submits only the email identity in email mode', () => {
    expect(
      buildRegisterPayload(validEmailRegistration, 'AFF123', verification)
    ).toEqual({
      username: 'demo_user',
      email: 'demo@example.com',
      verification_code: '123456',
      password: 'password123',
      aff_code: 'AFF123',
      captcha_verify_param: 'captcha-param',
    })
  })
})

describe('isValidMainlandChinaPhone', () => {
  test('rejects incomplete numbers before SMS can be sent', () => {
    expect(isValidMainlandChinaPhone('123')).toBe(false)
  })

  test('accepts a valid mainland China mobile number', () => {
    expect(isValidMainlandChinaPhone('13800138000')).toBe(true)
  })
})

describe('resolveAuthRedirect', () => {
  const origin = 'https://modelhub.example.com'

  test('keeps an internal path', () => {
    expect(resolveAuthRedirect('/pricing?tab=models', origin)).toBe(
      '/pricing?tab=models'
    )
  })

  test('normalizes an absolute same-origin URL', () => {
    expect(
      resolveAuthRedirect(
        'https://modelhub.example.com/dashboard#usage',
        origin
      )
    ).toBe('/dashboard#usage')
  })

  test('rejects an external URL', () => {
    expect(resolveAuthRedirect('https://example.org/phishing', origin)).toBe(
      '/dashboard'
    )
  })
})
