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
import {
  PAYMENT_TYPES,
  DEFAULT_PRESET_MULTIPLIERS,
  DEFAULT_MIN_TOPUP,
} from '../constants'
import type { PaymentMethod, PresetAmount, TopupInfo } from '../types'

// ============================================================================
// Payment Processing Functions
// ============================================================================

/**
 * Check if browser is Safari
 */
function isSafariBrowser(): boolean {
  return (
    navigator.userAgent.indexOf('Safari') > -1 &&
    navigator.userAgent.indexOf('Chrome') < 1
  )
}

/**
 * Submit payment form (for non-Stripe payments)
 */
export function submitPaymentForm(
  url: string,
  params: Record<string, unknown>
): void {
  const form = document.createElement('form')
  form.action = url
  form.method = 'POST'

  // Don't open in new tab for Safari
  if (!isSafariBrowser()) {
    form.target = '_blank'
  }

  // Add form parameters
  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

/**
 * Open a blank payment tab synchronously and immediately paint a loading
 * spinner so the user does not see a bare about:blank page while the API
 * request is in flight.
 */
export function openPaymentWindow(): Window | null {
  const win = window.open('', '_blank')
  if (win) {
    writeLoadingPage(win)
  }
  return win
}

function writeLoadingPage(targetWindow: Window): void {
  targetWindow.document.write(
    '<!DOCTYPE html><html><head>' +
      '<meta charset="utf-8">' +
      '<title>Redirecting...</title>' +
      '<style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5}' +
      '.spinner{width:48px;height:48px;border:4px solid #e0e0e0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite}' +
      '@keyframes spin{to{transform:rotate(360deg)}}' +
      '</style>' +
      '</head><body>' +
      '<div class="spinner"></div>' +
      '</body></html>'
  )
  targetWindow.document.close()
}

/**
 * Redirect a pre-opened blank tab to the payment URL.
 *
 * Safari only blocks popups created outside the user gesture context; once a
 * blank tab has been opened synchronously during the gesture, navigating that
 * existing tab via its location.href is allowed and does not trigger the popup
 * blocker.  We therefore assign the URL directly to the opened window.
 */
export function redirectPaymentWindow(
  targetWindow: Window | null,
  url: string
): void {
  if (targetWindow) {
    targetWindow.location.href = url
  } else {
    // Fallback: same-tab redirect when the blank tab could not be opened
    window.location.href = url
  }
}

/**
 * Check if payment method is Stripe
 */
export function isStripePayment(paymentType: string): boolean {
  return paymentType === PAYMENT_TYPES.STRIPE
}

/**
 * Check if payment method is Waffo Pancake
 *
 * Pancake is a metered-style payment that goes through a dedicated checkout
 * URL flow rather than the generic epay form submission, so it must be
 * special-cased in payment dispatch logic.
 */
export function isWaffoPancakePayment(paymentType: string): boolean {
  return paymentType === PAYMENT_TYPES.WAFFO_PANCAKE
}

/**
 * Get configured payment methods that are available for the current gateway
 * state. Direct Alipay remains available without Epay only when it is present
 * in the backend-provided method list.
 */
export function getAvailablePaymentMethods(
  topupInfo: TopupInfo | null
): PaymentMethod[] {
  if (!topupInfo || topupInfo.payment_compliance_confirmed === false) {
    return []
  }

  return (topupInfo.pay_methods ?? []).filter((method) => {
    switch (method.type) {
      case PAYMENT_TYPES.ALIPAY:
        return true
      case PAYMENT_TYPES.STRIPE:
        return topupInfo.enable_stripe_topup
      case PAYMENT_TYPES.WAFFO_PANCAKE:
        return topupInfo.enable_waffo_pancake_topup === true
      case PAYMENT_TYPES.WAFFO:
        return false
      default:
        return topupInfo.enable_online_topup
    }
  })
}

/**
 * Get the first available payment type from topup info.
 */
export function getDefaultPaymentType(topupInfo: TopupInfo | null): string {
  if (!topupInfo) {
    return ''
  }

  const availableMethods = getAvailablePaymentMethods(topupInfo)
  if (availableMethods.length > 0) {
    return availableMethods[0].type
  }

  if (topupInfo.enable_waffo_topup) {
    return PAYMENT_TYPES.WAFFO
  }

  if (topupInfo.enable_waffo_pancake_topup) {
    return PAYMENT_TYPES.WAFFO_PANCAKE
  }

  return ''
}

/**
 * Get minimum topup amount from topup info
 */
export function getMinTopupAmount(topupInfo: TopupInfo | null): number {
  if (!topupInfo || topupInfo.payment_compliance_confirmed === false) {
    return DEFAULT_MIN_TOPUP
  }

  const hasDirectAlipay = getAvailablePaymentMethods(topupInfo).some(
    (method) => method.type === PAYMENT_TYPES.ALIPAY
  )

  if (topupInfo.enable_online_topup || hasDirectAlipay) {
    return topupInfo.min_topup
  }

  if (topupInfo.enable_stripe_topup) {
    return topupInfo.stripe_min_topup
  }

  if (topupInfo.enable_waffo_topup) {
    return topupInfo.waffo_min_topup || DEFAULT_MIN_TOPUP
  }

  if (topupInfo.enable_waffo_pancake_topup) {
    return topupInfo.waffo_pancake_min_topup || DEFAULT_MIN_TOPUP
  }

  return DEFAULT_MIN_TOPUP
}

/**
 * Generate preset amounts based on minimum topup
 */
export function generatePresetAmounts(minAmount: number): PresetAmount[] {
  return DEFAULT_PRESET_MULTIPLIERS.map((multiplier) => ({
    value: minAmount * multiplier,
  }))
}

/**
 * Merge custom preset amounts with discounts
 */
export function mergePresetAmounts(
  amountOptions: number[],
  discounts: Record<number, number>
): PresetAmount[] {
  if (!amountOptions || amountOptions.length === 0) {
    return []
  }

  return amountOptions.map((amount) => ({
    value: amount,
    discount: discounts[amount] || 1.0,
  }))
}
