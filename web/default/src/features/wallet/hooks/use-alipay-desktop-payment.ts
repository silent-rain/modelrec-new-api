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
import i18next from 'i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { queryAlipayPayment, requestAlipayPayment } from '../api'
import {
  createDesktopAlipayQueryGate,
  getDesktopAlipayPollDelay,
  isDesktopAlipayExpired,
  resolveDesktopAlipayCashierUrl,
  resolveDesktopAlipayStatus,
  runDesktopAlipayBalanceRefresh,
  shouldPollDesktopAlipay,
  type AlipayDesktopCheckoutState,
  type AlipayDesktopPayment,
  type DesktopAlipayQueryGate,
} from '../lib/alipay-desktop-payment'

interface StartDesktopAlipayInput {
  amount: number
  displayAmount: number
}

interface UseAlipayDesktopPaymentOptions {
  onSuccess: () => Promise<void>
}

export function useAlipayDesktopPayment(
  options: UseAlipayDesktopPaymentOptions
): {
  state: AlipayDesktopCheckoutState
  processing: boolean
  checking: boolean
  startPayment: (input: StartDesktopAlipayInput) => Promise<boolean>
  checkNow: () => Promise<void>
  closeDialog: () => void
  retryPayment: () => void
} {
  const [state, setState] = useState<AlipayDesktopCheckoutState>({
    open: false,
    status: 'idle',
    payment: null,
    errorMessage: null,
  })
  const [checking, setChecking] = useState(false)
  const attemptRef = useRef(0)
  const flowRef = useRef(0)
  const paymentRef = useRef<AlipayDesktopPayment | null>(null)
  const onSuccessRef = useRef(options.onSuccess)
  const queryGateRef = useRef<DesktopAlipayQueryGate | null>(null)

  if (queryGateRef.current === null) {
    queryGateRef.current = createDesktopAlipayQueryGate()
  }

  onSuccessRef.current = options.onSuccess

  const checkOrder = useCallback(async function runCheckOrder(
    manual = false
  ): Promise<void> {
    const payment = paymentRef.current
    if (!payment) return
    const flow = flowRef.current

    if (isDesktopAlipayExpired(payment.expiresAt, Date.now())) {
      setState((previous) => ({
        ...previous,
        status: 'expired',
        errorMessage: null,
      }))
      return
    }

    const queryGate = queryGateRef.current
    if (!queryGate || !queryGate.tryAcquire(flow)) return

    attemptRef.current += 1
    if (manual) setChecking(true)

    try {
      let response
      try {
        response = await queryAlipayPayment(payment.outTradeNo)
        if (flowRef.current !== flow) return
        if (!response.data) throw new Error('Missing Alipay query data')
      } catch {
        if (flowRef.current !== flow) return
        if (manual) {
          setState((previous) => ({
            ...previous,
            errorMessage: i18next.t('Unable to check payment status'),
          }))
        }
        return
      }

      const nextStatus = resolveDesktopAlipayStatus(
        response.data.status,
        response.data.credited
      )
      if (nextStatus === 'success') {
        const refreshed = await runDesktopAlipayBalanceRefresh(
          onSuccessRef.current
        )
        if (flowRef.current !== flow) return
        if (!refreshed) {
          toast.error(i18next.t('Unable to refresh balance'))
        }
        toast.success(i18next.t('Payment successful'))
      }

      setState((previous) => {
        if (previous.status === nextStatus && previous.errorMessage === null) {
          return previous
        }

        return {
          ...previous,
          status: nextStatus,
          errorMessage: null,
        }
      })
    } finally {
      if (manual && flowRef.current === flow) setChecking(false)
      const releaseAction = queryGate.release(flow, flowRef.current)
      if (releaseAction === 'retry') void runCheckOrder()
    }
  }, [])

  const startPayment = useCallback(
    async (input: StartDesktopAlipayInput): Promise<boolean> => {
      const flow = flowRef.current + 1
      flowRef.current = flow
      setChecking(false)
      setState({
        open: true,
        status: 'creating',
        payment: null,
        errorMessage: null,
      })
      paymentRef.current = null
      attemptRef.current = 0

      try {
        const response = await requestAlipayPayment({
          amount: input.amount,
          scene: 'desktop',
        })
        if (flowRef.current !== flow) return false
        if (!response.data?.out_trade_no || !response.data.pay_data) {
          const errorMessage =
            response.message || i18next.t('Payment request failed')
          toast.error(errorMessage)
          setState({
            open: true,
            status: 'error',
            payment: null,
            errorMessage,
          })
          return false
        }

        const payment: AlipayDesktopPayment = {
          outTradeNo: response.data.out_trade_no,
          payUrl: response.data.pay_data,
          cashierUrl: resolveDesktopAlipayCashierUrl(
            response.data.cashier_url,
            response.data.pay_data
          ),
          expiresAt:
            response.data.expires_at ??
            Math.floor(Date.now() / 1_000) + 15 * 60,
          displayAmount: input.displayAmount,
        }
        paymentRef.current = payment
        setState({
          open: true,
          status: 'awaiting_payment',
          payment,
          errorMessage: null,
        })
        return true
      } catch {
        if (flowRef.current !== flow) return false
        const errorMessage = i18next.t('Payment request failed')
        toast.error(errorMessage)
        setState({
          open: true,
          status: 'error',
          payment: null,
          errorMessage,
        })
        return false
      }
    },
    []
  )

  useEffect(() => {
    return () => {
      flowRef.current += 1
    }
  }, [])

  useEffect(() => {
    const payment = state.payment
    if (!payment || !state.open || state.status !== 'awaiting_payment') {
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const expireLocally = (): boolean => {
      if (!isDesktopAlipayExpired(payment.expiresAt, Date.now())) return false

      setState((previous) => ({
        ...previous,
        status: 'expired',
        errorMessage: null,
      }))
      return true
    }

    const scheduleCheck = (): void => {
      timer = setTimeout(() => {
        void runAndSchedule()
      }, getDesktopAlipayPollDelay(attemptRef.current))
    }

    const runAndSchedule = async (): Promise<void> => {
      await checkOrder()
      if (disposed || document.hidden || expireLocally()) return
      scheduleCheck()
    }

    const handleVisibilityChange = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      if (document.hidden || expireLocally()) return
      void runAndSchedule()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (
      !expireLocally() &&
      shouldPollDesktopAlipay(state.status, state.open, document.hidden)
    ) {
      scheduleCheck()
    }

    return () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkOrder, state.open, state.payment, state.status])

  useEffect(() => {
    if (!state.open || state.status !== 'success') return

    const timer = setTimeout(() => {
      setState((previous) => ({ ...previous, open: false }))
    }, 1_200)
    return () => clearTimeout(timer)
  }, [state.open, state.status])

  const closeDialog = useCallback((): void => {
    flowRef.current += 1
    setChecking(false)
    setState((previous) => ({ ...previous, open: false }))
  }, [])

  const retryPayment = useCallback((): void => {
    flowRef.current += 1
    setChecking(false)
    attemptRef.current = 0
    paymentRef.current = null
    setState({
      open: false,
      status: 'idle',
      payment: null,
      errorMessage: null,
    })
  }, [])

  const processing = state.open && (state.status === 'creating' || checking)
  const checkNow = useCallback(() => checkOrder(true), [checkOrder])

  return {
    state,
    processing,
    checking,
    startPayment,
    checkNow,
    closeDialog,
    retryPayment,
  }
}
