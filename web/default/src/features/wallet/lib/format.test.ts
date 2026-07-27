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
import { afterEach, describe, test } from 'node:test'

import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import {
  formatWalletPaymentAmount,
  formatWalletTopupAmount,
  getWalletCurrencySymbol,
} from './format'

const originalConfig = useSystemConfigStore.getState().config

function setCurrency(
  quotaDisplayType: 'USD' | 'CNY' | 'TOKENS' | 'CUSTOM',
  overrides: Partial<typeof DEFAULT_CURRENCY_CONFIG> = {}
) {
  useSystemConfigStore.setState((state) => ({
    config: {
      ...state.config,
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaDisplayType,
        ...overrides,
      },
    },
  }))
}

afterEach(() => {
  useSystemConfigStore.setState({ config: originalConfig })
})

describe('wallet currency presentation', () => {
  test('uses yuan for wallet amounts without converting values again', () => {
    setCurrency('CUSTOM', {
      customCurrencySymbol: '燧点',
      customCurrencyExchangeRate: 10000,
    })

    assert.equal(formatWalletTopupAmount(10), '¥10')
    assert.equal(formatWalletPaymentAmount(50), '¥50')
    assert.equal(getWalletCurrencySymbol(), '¥')
  })

  test('keeps payment currency independent from quota display settings', () => {
    setCurrency('USD')
    assert.equal(formatWalletTopupAmount(10), '¥10')
    assert.equal(formatWalletPaymentAmount('8.5'), '¥8.5')
    assert.equal(getWalletCurrencySymbol(), '¥')

    setCurrency('TOKENS')
    assert.equal(formatWalletTopupAmount(10), '¥10')
    assert.equal(formatWalletPaymentAmount(10), '¥10')
    assert.equal(getWalletCurrencySymbol(), '¥')
  })

  test('rejects non-finite payment values', () => {
    setCurrency('CNY')
    assert.equal(formatWalletPaymentAmount('invalid'), '-')
  })
})
