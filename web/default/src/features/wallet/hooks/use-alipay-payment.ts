import i18next from 'i18next'
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
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import { requestAlipayPayment } from '../api'
import type { AlipayPaymentData, AlipayPaymentResponse } from '../types'

/**
 * Treat the Alipay create response as successful when it exposes a payment
 * link. The endpoint uses a non-standard envelope ({ code, message, data })
 * that is not covered by the global business-error interceptor.
 */
function isAlipaySuccess(response: AlipayPaymentResponse): boolean {
  if (response?.data?.pay_data) return true
  return response?.code === 0 || response?.message === 'ok'
}

// ============================================================================
// Alipay Payment Hook
// ============================================================================

export function useAlipayPayment() {
  const [processing, setProcessing] = useState(false)

  const processAlipayPayment = useCallback(
    async (params: { amount: number }): Promise<AlipayPaymentData | null> => {
      try {
        setProcessing(true)

        const response = await requestAlipayPayment({
          amount: params.amount,
          scene: 'desktop',
        })

        if (!isAlipaySuccess(response)) {
          toast.error(response?.message || i18next.t('Payment request failed'))
          return null
        }

        return response.data ?? null
      } catch {
        toast.error(i18next.t('Payment request failed'))
        return null
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return { processing, processAlipayPayment }
}
