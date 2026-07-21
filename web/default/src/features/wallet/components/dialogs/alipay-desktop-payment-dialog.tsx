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
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { AlipayDesktopCheckoutState } from '../../lib/alipay-desktop-payment'
import { formatWalletPaymentAmount } from '../../lib/format'

interface AlipayDesktopPaymentDialogProps {
  state: AlipayDesktopCheckoutState
  checking: boolean
  onOpenChange: (open: boolean) => void
  onCheckNow: () => void
  onRetry: () => void
}

export function AlipayDesktopPaymentDialog(
  props: AlipayDesktopPaymentDialogProps
) {
  const { t } = useTranslation()
  const waitingForPayment = props.state.status === 'awaiting_payment'

  let title = t('Alipay checkout')
  let description = t('Creating payment order')
  if (waitingForPayment) {
    description = t('Scan with Alipay to pay')
  } else if (props.state.status === 'success') {
    title = t('Payment successful')
    description = t('Payment successful')
  } else if (props.state.status === 'closed') {
    title = t('Payment order closed')
    description = t('Payment order closed')
  } else if (props.state.status === 'expired') {
    title = t('Payment QR code expired')
    description = t('Payment QR code expired')
  } else if (props.state.status === 'error') {
    title = t('Payment request failed')
    description = props.state.errorMessage || t('Payment request failed')
  }

  const retryable =
    props.state.status === 'closed' ||
    props.state.status === 'expired' ||
    props.state.status === 'error'

  let paymentStatusIcon = (
    <span
      className='bg-primary size-2 shrink-0 rounded-full'
      aria-hidden='true'
    />
  )
  if (props.state.errorMessage) {
    paymentStatusIcon = (
      <AlertCircle
        className='text-destructive size-4 shrink-0'
        aria-hidden='true'
      />
    )
  } else if (props.checking) {
    paymentStatusIcon = (
      <Loader2
        className='text-primary size-4 shrink-0 animate-spin'
        aria-hidden='true'
      />
    )
  }

  return (
    <Dialog open={props.state.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[calc(100dvh-1.5rem)] overflow-y-auto max-sm:w-[calc(100vw-1.5rem)] sm:max-w-[440px]'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {props.state.status === 'creating' ? (
          <div
            className='flex min-h-48 flex-col items-center justify-center gap-4 py-6'
            role='status'
          >
            <Loader2
              className='text-primary size-12 animate-spin'
              aria-hidden='true'
            />
            <p className='text-muted-foreground text-sm'>
              {t('Creating payment order')}
            </p>
          </div>
        ) : null}

        {waitingForPayment && props.state.payment ? (
          <div className='space-y-3'>
            <div className='bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2'>
              <span className='text-muted-foreground text-sm'>
                {t('You Pay')}
              </span>
              <span className='text-lg font-semibold'>
                {formatWalletPaymentAmount(props.state.payment.displayAmount)}
              </span>
            </div>

            <div className='bg-muted/40 flex justify-center rounded-xl p-3'>
              <div className='border-border size-[246px] overflow-hidden rounded-xl border bg-white p-3 shadow-xs'>
                {/* eslint-disable-next-line react/iframe-missing-sandbox -- Alipay page-pay requires unsandboxed navigation. */}
                <iframe
                  title={t('Alipay checkout')}
                  src={props.state.payment.payUrl}
                  className='pointer-events-none size-[220px] border-0 bg-white'
                  allow='payment'
                  scrolling='no'
                  tabIndex={-1}
                />
              </div>
            </div>

            <div
              className='bg-muted/50 text-muted-foreground flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm'
              role='status'
              aria-live='polite'
            >
              {paymentStatusIcon}
              <span>
                {props.state.errorMessage ||
                  (props.checking
                    ? t('Checking payment result')
                    : t('Payment in progress'))}
              </span>
            </div>
          </div>
        ) : null}

        {props.state.status === 'success' ? (
          <div
            className='flex min-h-48 flex-col items-center justify-center gap-4 py-6 text-center'
            role='status'
          >
            <CheckCircle2
              className='size-14 text-green-600'
              aria-hidden='true'
            />
            <p className='text-lg font-semibold'>{t('Payment successful')}</p>
          </div>
        ) : null}

        {retryable ? (
          <div className='flex min-h-40 flex-col items-center justify-center gap-4 py-6 text-center'>
            <RotateCcw
              className='text-muted-foreground size-12'
              aria-hidden='true'
            />
            <p className='text-muted-foreground text-sm'>{description}</p>
          </div>
        ) : null}

        {waitingForPayment && props.state.payment ? (
          <DialogFooter className='grid grid-cols-2 gap-2 sm:grid-cols-2'>
            <Button
              variant='outline'
              render={
                <a
                  href={props.state.payment.payUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              {t('Open Alipay cashier')}
            </Button>
            <Button onClick={props.onCheckNow} disabled={props.checking}>
              <span className='inline-flex size-4 items-center justify-center'>
                {props.checking ? (
                  <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                ) : null}
              </span>
              {t('Check payment status')}
            </Button>
          </DialogFooter>
        ) : null}

        {retryable ? (
          <DialogFooter>
            <Button onClick={props.onRetry}>
              <RotateCcw className='size-4' aria-hidden='true' />
              {t('Retry payment')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
