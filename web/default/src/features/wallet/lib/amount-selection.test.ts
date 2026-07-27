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
  CUSTOM_AMOUNT_SELECTION,
  INITIAL_RECHARGE_AMOUNT_STATE,
  parseCustomAmount,
  rechargeAmountReducer,
} from './amount-selection'

describe('wallet recharge amount selection', () => {
  test('initializes the first preset only while selection is unset', () => {
    const initialized = rechargeAmountReducer(INITIAL_RECHARGE_AMOUNT_STATE, {
      type: 'initialize',
      amount: 10,
    })

    assert.deepEqual(initialized, {
      selection: 10,
      topupAmount: 10,
      customAmount: '',
    })

    const customSelection = {
      selection: CUSTOM_AMOUNT_SELECTION,
      topupAmount: 0,
      customAmount: '',
    } as const

    assert.equal(
      rechargeAmountReducer(customSelection, {
        type: 'initialize',
        amount: 20,
      }),
      customSelection
    )
  })

  test('keeps the custom draft independent from preset selections', () => {
    const customSelection = {
      selection: CUSTOM_AMOUNT_SELECTION,
      topupAmount: 57,
      customAmount: '57',
    } as const

    const presetSelection = rechargeAmountReducer(customSelection, {
      type: 'select-preset',
      amount: 20,
    })

    assert.deepEqual(presetSelection, {
      selection: 20,
      topupAmount: 20,
      customAmount: '57',
    })
    assert.deepEqual(
      rechargeAmountReducer(presetSelection, { type: 'select-custom' }),
      {
        selection: CUSTOM_AMOUNT_SELECTION,
        topupAmount: 57,
        customAmount: '57',
      }
    )
  })

  test('accepts only plain integer amounts from 1 through 100000', () => {
    assert.equal(parseCustomAmount('1'), 1)
    assert.equal(parseCustomAmount('57'), 57)
    assert.equal(parseCustomAmount('100000'), 100000)

    for (const value of ['', '0', '-1', '1.5', '1e2', 'invalid', '100001']) {
      assert.equal(parseCustomAmount(value), 0, value)
    }
  })

  test('treats an empty custom draft as no active amount', () => {
    assert.deepEqual(
      rechargeAmountReducer(INITIAL_RECHARGE_AMOUNT_STATE, {
        type: 'edit-custom',
        value: '',
      }),
      {
        selection: CUSTOM_AMOUNT_SELECTION,
        topupAmount: 0,
        customAmount: '',
      }
    )
  })
})
