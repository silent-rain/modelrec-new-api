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
  formatWalletQuotaAmount,
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
  test('separates the USD top-up, CNY payment, and custom quota units', () => {
    setCurrency('CUSTOM', {
      customCurrencySymbol: '燧点',
      customCurrencyExchangeRate: 7000,
      usdExchangeRate: 7,
      paymentCurrencySymbol: '¥',
    })
    const currency = useSystemConfigStore.getState().config.currency

    assert.equal(formatWalletTopupAmount(10), '$10')
    assert.equal(formatWalletQuotaAmount(10, currency), '70,000燧点')
    assert.equal(formatWalletPaymentAmount(70, '¥'), '¥70')
    assert.equal(getWalletCurrencySymbol(), '$')
  })

  test('formats other quota display modes without changing the USD input unit', () => {
    setCurrency('USD')
    assert.equal(
      formatWalletQuotaAmount(
        10,
        useSystemConfigStore.getState().config.currency
      ),
      '$10'
    )

    setCurrency('TOKENS', { quotaPerUnit: 500000 })
    assert.equal(
      formatWalletQuotaAmount(
        10,
        useSystemConfigStore.getState().config.currency
      ),
      '5,000,000'
    )
    assert.equal(formatWalletTopupAmount(10), '$10')
  })

  test('rejects non-finite payment values', () => {
    setCurrency('CNY')
    assert.equal(formatWalletPaymentAmount('invalid'), '-')
  })
})
