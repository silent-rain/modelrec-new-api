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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { SystemStatus } from '@/features/auth/types'

import {
  DEFAULT_LOGIN_MODE,
  isPasswordLoginAvailable,
  isRegistrationEntryVisible,
} from './login-page-options'

describe('login page options', () => {
  test('defaults to phone login and keeps login available while status loads', () => {
    assert.equal(DEFAULT_LOGIN_MODE, 'sms')
    assert.equal(isPasswordLoginAvailable(null), true)
  })

  test('reads the password login switch from direct and nested status data', () => {
    assert.equal(
      isPasswordLoginAvailable({ password_login_enabled: false }),
      false
    )
    assert.equal(
      isPasswordLoginAvailable({ data: { password_login_enabled: false } }),
      false
    )
  })

  test('shows registration only when all existing switches allow it', () => {
    assert.equal(isRegistrationEntryVisible(null), true)
    assert.equal(isRegistrationEntryVisible({ register_enabled: false }), false)
    assert.equal(
      isRegistrationEntryVisible({ password_register_enabled: false }),
      false
    )
    assert.equal(
      isRegistrationEntryVisible({ self_use_mode_enabled: true }),
      false
    )
  })

  test('supports nested status data without changing registration semantics', () => {
    const status: SystemStatus = {
      data: {
        register_enabled: true,
        password_register_enabled: true,
        self_use_mode_enabled: false,
      },
    }

    assert.equal(isRegistrationEntryVisible(status), true)
  })
})
