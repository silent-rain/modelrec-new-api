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
import type { AlipayOrderStatus } from '../types'

export type AlipayDesktopFlowStatus =
  | 'idle'
  | 'creating'
  | 'awaiting_payment'
  | 'success'
  | 'closed'
  | 'expired'
  | 'error'

export interface AlipayDesktopPayment {
  outTradeNo: string
  payUrl: string
  cashierUrl: string
  expiresAt: number
  displayAmount: number
}

export interface AlipayDesktopCheckoutState {
  open: boolean
  status: AlipayDesktopFlowStatus
  payment: AlipayDesktopPayment | null
  errorMessage: string | null
}

export interface DesktopAlipayQueryGate {
  tryAcquire: (flow: number) => boolean
  release: (flow: number, currentFlow: number) => 'idle' | 'retry'
}

export function createDesktopAlipayQueryGate(): DesktopAlipayQueryGate {
  let activeFlow: number | null = null
  let queuedFlow: number | null = null

  return {
    tryAcquire(flow: number): boolean {
      if (activeFlow === null) {
        activeFlow = flow
        if (queuedFlow === flow) queuedFlow = null
        return true
      }
      if (activeFlow !== flow) queuedFlow = flow
      return false
    },
    release(flow: number, currentFlow: number): 'idle' | 'retry' {
      if (activeFlow !== flow) return 'idle'

      activeFlow = null
      const action = queuedFlow === currentFlow ? 'retry' : 'idle'
      queuedFlow = null
      return action
    },
  }
}

export async function runDesktopAlipayBalanceRefresh(
  refresh: () => Promise<void>
): Promise<boolean> {
  try {
    await refresh()
    return true
  } catch {
    return false
  }
}

export function resolveDesktopAlipayCashierUrl(
  cashierUrl: string | undefined,
  embeddedPayUrl: string
): string {
  return cashierUrl?.trim() || embeddedPayUrl
}

export function requireDesktopAlipayRefreshData<T>(response: {
  success?: boolean
  data?: T | null
}): T {
  if (
    !response.success ||
    response.data === undefined ||
    response.data === null
  ) {
    throw new Error('Invalid user refresh response')
  }

  return response.data
}

export function getDesktopAlipayPollDelay(attempt: number): number {
  if (attempt < 4) return 3_000
  if (attempt < 10) return 5_000
  return 8_000
}

export function isDesktopAlipayTerminal(
  status: AlipayDesktopFlowStatus
): boolean {
  return status === 'success' || status === 'closed' || status === 'expired'
}

export function isDesktopAlipayExpired(
  expiresAt: number,
  now: number
): boolean {
  return now >= expiresAt * 1_000
}

export function shouldPollDesktopAlipay(
  status: AlipayDesktopFlowStatus,
  open: boolean,
  hidden: boolean
): boolean {
  return open && status === 'awaiting_payment' && !hidden
}

export function resolveDesktopAlipayStatus(
  status: AlipayOrderStatus,
  credited: boolean
): AlipayDesktopFlowStatus {
  if (status === 'success' && credited) return 'success'
  if (status === 'closed') return 'closed'
  return 'awaiting_payment'
}
