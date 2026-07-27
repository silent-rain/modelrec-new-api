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

import { renderToStaticMarkup } from 'react-dom/server'

import { getPaymentIcon, usesAlipayWordmark } from './ui'

describe('payment brand icons', () => {
  test('uses the local horizontal Alipay wordmark for the default config', () => {
    assert.equal(usesAlipayWordmark('alipay'), true)
    assert.equal(usesAlipayWordmark('alipay', 'SiAlipay'), true)

    const markup = renderToStaticMarkup(
      <>{getPaymentIcon('alipay', 'h-8 w-auto', 'SiAlipay', '支付宝')}</>
    )
    assert.match(markup, /src="\/pay-alipay\.svg"/)
    assert.match(markup, /alt="支付宝"/)
  })

  test('keeps administrator-provided Alipay assets and other icons', () => {
    assert.equal(
      usesAlipayWordmark('alipay', 'https://cdn.example.com/pay.svg'),
      false
    )
    assert.equal(usesAlipayWordmark('alipay', 'SiCreditCard'), false)
    assert.equal(usesAlipayWordmark('wxpay', 'SiWechat'), false)

    const markup = renderToStaticMarkup(
      <>
        {getPaymentIcon(
          'alipay',
          'h-8 w-auto',
          'https://cdn.example.com/pay.svg',
          'Custom Alipay'
        )}
      </>
    )
    assert.match(markup, /https:\/\/cdn\.example\.com\/pay\.svg/)
    assert.doesNotMatch(markup, /pay-alipay\.svg/)
  })
})
