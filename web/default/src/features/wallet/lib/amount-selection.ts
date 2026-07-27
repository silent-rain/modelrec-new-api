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

export const CUSTOM_AMOUNT_SELECTION = 'custom' as const
export const CUSTOM_AMOUNT_MIN = 1
export const CUSTOM_AMOUNT_MAX = 100_000

export type RechargeAmountSelection =
  | number
  | typeof CUSTOM_AMOUNT_SELECTION
  | null

export interface RechargeAmountState {
  selection: RechargeAmountSelection
  topupAmount: number
  customAmount: string
}

type RechargeAmountAction =
  | { type: 'initialize'; amount: number }
  | { type: 'select-preset'; amount: number }
  | { type: 'select-custom' }
  | { type: 'edit-custom'; value: string }

export const INITIAL_RECHARGE_AMOUNT_STATE: RechargeAmountState = {
  selection: null,
  topupAmount: 0,
  customAmount: '',
}

export function parseCustomAmount(value: string): number {
  if (!/^\d+$/.test(value)) return 0

  const amount = Number(value)
  return Number.isSafeInteger(amount) &&
    amount >= CUSTOM_AMOUNT_MIN &&
    amount <= CUSTOM_AMOUNT_MAX
    ? amount
    : 0
}

export function rechargeAmountReducer(
  state: RechargeAmountState,
  action: RechargeAmountAction
): RechargeAmountState {
  switch (action.type) {
    case 'initialize':
      if (state.selection !== null) return state
      return {
        ...state,
        selection: action.amount,
        topupAmount: action.amount,
      }
    case 'select-preset':
      return {
        ...state,
        selection: action.amount,
        topupAmount: action.amount,
      }
    case 'select-custom':
      return {
        ...state,
        selection: CUSTOM_AMOUNT_SELECTION,
        topupAmount: parseCustomAmount(state.customAmount),
      }
    case 'edit-custom':
      return {
        selection: CUSTOM_AMOUNT_SELECTION,
        topupAmount: parseCustomAmount(action.value),
        customAmount: action.value,
      }
  }
}
