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

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import { CUSTOM_AMOUNT_SELECTION } from '../lib'
import type { PaymentMethod, PresetAmount, TopupInfo } from '../types'
import { RechargeFormCard } from './recharge-form-card'

const testI18n = createInstance()
await testI18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Custom Amount': 'Custom Amount',
        'Please enter an amount between 1 and 100000 yuan.':
          'Please enter an amount between 1 and 100000 yuan.',
      },
    },
  },
})

const topupInfo: TopupInfo = {
  enable_online_topup: true,
  enable_stripe_topup: false,
  pay_methods: [{ name: 'Alipay', type: 'alipay' }],
  min_topup: 1,
  stripe_min_topup: 1,
  amount_options: [10, 20],
  discount: {},
  payment_compliance_confirmed: true,
}

interface RenderOverrides {
  selectedPreset: number | typeof CUSTOM_AMOUNT_SELECTION | null
  customAmount?: string
}

function renderCard(overrides: RenderOverrides): string {
  const props = {
    topupInfo,
    presetAmounts: [{ value: 10 }, { value: 20 }] satisfies PresetAmount[],
    selectedPreset: overrides.selectedPreset,
    onSelectPreset: (_preset: PresetAmount) => undefined,
    onSelectCustom: () => undefined,
    topupAmount: 10,
    customAmount: overrides.customAmount ?? '',
    onCustomAmountChange: (_value: string) => undefined,
    onPaymentMethodSelect: (_method: PaymentMethod) => undefined,
    paymentLoading: null,
    redemptionCode: '',
    onRedemptionCodeChange: (_code: string) => undefined,
    onRedeem: () => undefined,
    redeeming: false,
  }

  return renderToStaticMarkup(
    <I18nextProvider i18n={testI18n}>
      <RechargeFormCard
        {...(props as unknown as React.ComponentProps<typeof RechargeFormCard>)}
      />
    </I18nextProvider>
  )
}

describe('wallet recharge amount controls', () => {
  test('keeps the custom option beside presets without showing its input', () => {
    const markup = renderCard({ selectedPreset: 10 })

    assert.ok(markup.includes('data-testid="custom-amount-option"'))
    assert.equal(markup.includes('id="topup-amount"'), false)
  })

  test('shows the independent draft only while custom amount is selected', () => {
    const markup = renderCard({
      selectedPreset: CUSTOM_AMOUNT_SELECTION,
      customAmount: '57',
    })

    assert.ok(markup.includes('data-testid="custom-amount-option"'))
    assert.ok(markup.includes('aria-pressed="true"'))
    assert.ok(markup.includes('id="topup-amount"'))
    assert.ok(markup.includes('value="57"'))
    assert.ok(markup.includes('min="1"'))
    assert.ok(markup.includes('max="100000"'))
    assert.ok(markup.includes('step="1"'))
    assert.ok(markup.includes('aria-describedby="topup-amount-help"'))
    assert.ok(
      markup.includes('Please enter an amount between 1 and 100000 yuan.')
    )
    assert.equal(markup.includes('Amount to pay:'), false)
  })

  test('marks a non-empty out-of-range custom amount as invalid', () => {
    const markup = renderCard({
      selectedPreset: CUSTOM_AMOUNT_SELECTION,
      customAmount: '100001',
    })

    assert.ok(markup.includes('aria-invalid="true"'))
    assert.ok(markup.includes('text-destructive'))
  })
})
