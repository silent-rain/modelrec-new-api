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

import {
  createDesktopAlipayQueryGate,
  getDesktopAlipayPollDelay,
  isDesktopAlipayExpired,
  isDesktopAlipayTerminal,
  requireDesktopAlipayRefreshData,
  resolveDesktopAlipayStatus,
  runDesktopAlipayBalanceRefresh,
  shouldPollDesktopAlipay,
} from './alipay-desktop-payment'

describe('desktop Alipay state helpers', () => {
  test('retries the current flow after an older query releases the gate', () => {
    const gate = createDesktopAlipayQueryGate()

    assert.equal(gate.tryAcquire(1), true)
    assert.equal(gate.tryAcquire(2), false)
    assert.equal(gate.release(1, 2), 'retry')
    assert.equal(gate.tryAcquire(2), true)
  })

  test('contains balance refresh rejection after credited success', async () => {
    const refreshed = await runDesktopAlipayBalanceRefresh(async () => {
      throw new Error('refresh failed')
    })

    assert.equal(refreshed, false)
  })

  test('requires successful user data after payment', () => {
    const user = { id: 1 }

    assert.equal(
      requireDesktopAlipayRefreshData({ success: true, data: user }),
      user
    )
    assert.throws(() =>
      requireDesktopAlipayRefreshData({ success: false, data: user })
    )
    assert.throws(() =>
      requireDesktopAlipayRefreshData<{ id: number }>({ success: true })
    )
  })

  test('backs polling off without creating a busy refresh loop', () => {
    assert.deepEqual(
      [0, 4, 10].map(getDesktopAlipayPollDelay),
      [3_000, 5_000, 8_000]
    )
  })

  test('recognizes terminal, expired, and pollable states', () => {
    assert.equal(isDesktopAlipayTerminal('awaiting_payment'), false)
    assert.equal(isDesktopAlipayTerminal('success'), true)
    assert.equal(isDesktopAlipayTerminal('closed'), true)
    assert.equal(isDesktopAlipayTerminal('expired'), true)
    assert.equal(isDesktopAlipayExpired(100, 100_000), true)
    assert.equal(shouldPollDesktopAlipay('awaiting_payment', true, false), true)
    assert.equal(shouldPollDesktopAlipay('awaiting_payment', true, true), false)
  })

  test('maps Alipay trade status to desktop flow status', () => {
    assert.equal(resolveDesktopAlipayStatus('TRADE_SUCCESS'), 'success')
    assert.equal(resolveDesktopAlipayStatus('TRADE_FINISHED'), 'success')
    assert.equal(resolveDesktopAlipayStatus('TRADE_CLOSED'), 'closed')
    assert.equal(
      resolveDesktopAlipayStatus('WAIT_BUYER_PAY'),
      'awaiting_payment'
    )
    assert.equal(resolveDesktopAlipayStatus(''), 'awaiting_payment')
  })
})
