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

import * as payment from '../src/features/wallet/lib/payment'
import type { PaymentMethod, TopupInfo } from '../src/features/wallet/types'

const buildTopupInfo = (overrides: Partial<TopupInfo> = {}): TopupInfo => ({
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 25,
  stripe_min_topup: 10,
  amount_options: [25, 50],
  discount: {},
  payment_compliance_confirmed: true,
  ...overrides,
})

const configuredMethods: PaymentMethod[] = [
  { name: 'WeChat', type: 'wxpay' },
  { name: 'Alipay', type: 'alipay' },
]

describe('wallet top-up configuration', () => {
  test('fails closed when payment compliance is disabled', () => {
    const selector = Reflect.get(payment, 'getAvailablePaymentMethods')
    expect(selector).toBeFunction()
    if (typeof selector !== 'function') return

    const disabledInfo = buildTopupInfo({
      pay_methods: configuredMethods,
      payment_compliance_confirmed: false,
    })

    expect(selector(disabledInfo)).toEqual([])
    expect(payment.getDefaultPaymentType(disabledInfo)).toBe('')
  })

  test('keeps direct Alipay without exposing disabled Epay methods', () => {
    const selector = Reflect.get(payment, 'getAvailablePaymentMethods')
    expect(selector).toBeFunction()
    if (typeof selector !== 'function') return

    expect(
      selector(buildTopupInfo({ pay_methods: configuredMethods })).map(
        (method: PaymentMethod) => method.type
      )
    ).toEqual(['alipay'])
  })

  test('uses the configured global minimum for direct Alipay', () => {
    expect(
      payment.getMinTopupAmount(
        buildTopupInfo({ pay_methods: configuredMethods })
      )
    ).toBe(25)
  })

  test('chooses an available configured method as the default', () => {
    expect(
      payment.getDefaultPaymentType(
        buildTopupInfo({ pay_methods: configuredMethods })
      )
    ).toBe('alipay')
  })
})

const readWalletSource = (path: string) =>
  Bun.file(new URL(`../src/features/wallet/${path}`, import.meta.url)).text()

describe('wallet top-up source boundary', () => {
  test('does not contain the hard-coded Alipay fallback', async () => {
    const [formSource, walletSource] = await Promise.all([
      readWalletSource('components/recharge-form-card.tsx'),
      readWalletSource('index.tsx'),
    ])

    expect(formSource).toContain(
      'const paymentMethods = getAvailablePaymentMethods(topupInfo)'
    )
    expect(formSource).not.toContain('Ensure Alipay is always available')
    expect(formSource).not.toContain('simplePaymentMethod')
    expect(formSource).not.toContain('{ value: 50, label:')
    expect(formSource).not.toContain('onPayNow?:')
    expect(walletSource).not.toContain('handlePayNow')
  })

  test('restores the unavailable and compliance states', async () => {
    const formSource = await readWalletSource(
      'components/recharge-form-card.tsx'
    )

    expect(formSource).not.toContain('// <Alert>')
    expect(formSource).toContain(
      'Online topup is not enabled. Please use redemption code or contact administrator.'
    )
    expect(formSource).toContain(
      'Redemption codes are disabled until the administrator confirms compliance terms.'
    )
  })
})
