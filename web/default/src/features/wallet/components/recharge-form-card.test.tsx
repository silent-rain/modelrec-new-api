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
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

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
        Pay: 'Pay',
        'You save': 'You save',
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
  topupAmount?: number
  minTopup?: number
  paymentName?: string
  paymentType?: string
  paymentIcon?: string
}

function renderCard(overrides: RenderOverrides): string {
  const renderedTopupInfo: TopupInfo = {
    ...topupInfo,
    min_topup: overrides.minTopup ?? topupInfo.min_topup,
    pay_methods: [
      {
        name: overrides.paymentName ?? 'Alipay',
        type: overrides.paymentType ?? 'alipay',
        icon: overrides.paymentIcon,
        min_topup: overrides.minTopup,
      },
    ],
  }
  const props = {
    topupInfo: renderedTopupInfo,
    presetAmounts: [{ value: 10 }, { value: 20 }] satisfies PresetAmount[],
    selectedPreset: overrides.selectedPreset,
    onSelectPreset: (_preset: PresetAmount) => undefined,
    onSelectCustom: () => undefined,
    topupAmount: overrides.topupAmount ?? 10,
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

const originalConfig = useSystemConfigStore.getState().config

beforeEach(() => {
  useSystemConfigStore.setState((state) => ({
    config: {
      ...state.config,
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaDisplayType: 'CUSTOM',
        usdExchangeRate: 1,
        customCurrencySymbol: '燧点',
        customCurrencyExchangeRate: 10000,
      },
    },
  }))
})

afterEach(() => {
  useSystemConfigStore.setState({ config: originalConfig })
})

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

  test('shows configured currency on preset, payment, and custom input amounts', () => {
    const presetMarkup = renderCard({ selectedPreset: 10 })
    assert.match(presetMarkup, /¥10/)
    assert.match(presetMarkup, /Pay.*¥10/)

    const customMarkup = renderCard({
      selectedPreset: CUSTOM_AMOUNT_SELECTION,
      customAmount: '57',
    })
    assert.match(customMarkup, /data-testid="custom-amount-currency-symbol"/)
    assert.match(customMarkup, />¥<\/span>/)
    assert.match(customMarkup, /value="57"/)
  })

  test('renders the full Alipay wordmark without duplicate visible name', () => {
    const markup = renderCard({
      selectedPreset: 10,
      paymentIcon: 'SiAlipay',
    })

    assert.match(markup, /src="\/pay-alipay\.svg"/)
    assert.doesNotMatch(markup, />Alipay<\/span>/)
  })

  test('renders the full WeChat Pay wordmark without duplicate visible name', () => {
    const markup = renderCard({
      selectedPreset: 10,
      paymentName: '微信支付',
      paymentType: 'wxpay',
      paymentIcon: 'SiWechat',
    })

    assert.match(markup, /src="\/pay-wechat\.svg"/)
    assert.doesNotMatch(markup, />微信支付<\/span>/)
    assert.match(markup, /h-7 w-auto max-w-\[122px\] object-contain/)
  })

  test('keeps payment wordmarks at equal visual height in the confirmation dialog', () => {
    const dialogSource = readFileSync(
      new URL('./dialogs/payment-confirm-dialog.tsx', import.meta.url),
      'utf8'
    )

    assert.match(dialogSource, /h-5 w-auto max-w-\[88px\] object-contain/)
  })

  test('uses neutral disabled payment styling below the channel minimum', () => {
    const markup = renderCard({
      selectedPreset: CUSTOM_AMOUNT_SELECTION,
      customAmount: '',
      topupAmount: 0,
      minTopup: 10,
      paymentIcon: 'SiAlipay',
    })

    assert.match(markup, /disabled=""/)
    assert.match(markup, /data-wallet-payment-method=""/)
    assert.match(markup, /disabled:bg-zinc-100/)
    assert.match(markup, /disabled:border-zinc-200/)
    assert.match(markup, /grayscale/)
  })
})
