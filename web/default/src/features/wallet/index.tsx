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
import { useState, useEffect, useCallback, useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { useIsMobile } from '@/hooks/use-mobile'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getSelf } from '@/lib/api'

import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { AlipayDesktopPaymentDialog } from './components/dialogs/alipay-desktop-payment-dialog'
import { AlipayPaymentDialog } from './components/dialogs/alipay-payment-dialog'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { DEFAULT_DISCOUNT_RATE, PAYMENT_TYPES } from './constants'
import {
  useTopupInfo,
  usePayment,
  useAffiliate,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
  useAlipayDesktopPayment,
  useAlipayPayment,
} from './hooks'
import {
  INITIAL_RECHARGE_AMOUNT_STATE,
  getDefaultPaymentType,
  getMinTopupAmount,
  isWaffoPancakePayment,
  openPaymentWindow,
  parseCustomAmount,
  rechargeAmountReducer,
  redirectPaymentWindow,
  requireDesktopAlipayRefreshData,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [amountState, dispatchAmount] = useReducer(
    rechargeAmountReducer,
    INITIAL_RECHARGE_AMOUNT_STATE
  )
  const topupAmount = amountState.topupAmount
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)
  const [alipayModalOpen, setAlipayModalOpen] = useState(false)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate for display
  // - USD: ratio of 1 (base unit)
  // - CUSTOM: use customCurrencyExchangeRate for display
  // - Other (CNY/TOKENS): use usdExchangeRate
  const effectiveUsdExchangeRate = useMemo(() => {
    if (currency?.quotaDisplayType === 'USD') return 1
    if (currency?.quotaDisplayType === 'CUSTOM')
      return currency?.customCurrencyExchangeRate || 1
    return currency?.usdExchangeRate || 1
  }, [
    currency?.quotaDisplayType,
    currency?.usdExchangeRate,
    currency?.customCurrencyExchangeRate,
  ])

  // CUSTOM 展示类型下，充值按人民币计价：预设/输入的 amount 即人民币元数。
  // - 应付倍率取 1（实付 = 元 × 折扣，不叠加 USD Price）
  // - 「获得数量」按每元燧点数换算（元 × PointsPerCNY），并以自定义符号展示
  const isCustomCurrency = currency?.quotaDisplayType === 'CUSTOM'
  const topupPriceRatio = isCustomCurrency ? 1 : (status?.price as number) || 1
  const topupDisplayRate = isCustomCurrency
    ? currency?.pointsPerCNY || 0
    : effectiveUsdExchangeRate
  const topupCurrencySymbol = isCustomCurrency
    ? currency?.customCurrencySymbol || ''
    : undefined
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
    setAmount: setPaymentAmount,
  } = usePayment()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()
  const { processing: alipayProcessing, processAlipayPayment } =
    useAlipayPayment()

  const refreshUserAfterPayment = useCallback(async (): Promise<void> => {
    const response = await getSelf()
    const refreshedUser =
      requireDesktopAlipayRefreshData<UserWalletData>(response)
    setUser(refreshedUser)
  }, [])

  // Fetch and refresh user data with page-level loading and error recovery.
  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      setUserLoading(true)
      await refreshUserAfterPayment()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
    } finally {
      setUserLoading(false)
    }
  }, [refreshUserAfterPayment])

  const desktopAlipay = useAlipayDesktopPayment({
    onSuccess: refreshUserAfterPayment,
  })

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory])

  // Initialize topup amount when topup info is loaded
  useEffect(() => {
    const initialPreset = presetAmounts[0]
    if (!topupInfo || !initialPreset || amountState.selection !== null) return

    dispatchAmount({ type: 'initialize', amount: initialPreset.value })

    const defaultPaymentType = getDefaultPaymentType(topupInfo)
    if (defaultPaymentType) {
      calculatePaymentAmount(initialPreset.value, defaultPaymentType)
    }
  }, [topupInfo, presetAmounts, amountState.selection, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    dispatchAmount({ type: 'select-preset', amount: preset.value })
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  const handleSelectCustom = () => {
    dispatchAmount({ type: 'select-custom' })
    const customAmount = parseCustomAmount(amountState.customAmount)
    if (customAmount === 0) {
      setPaymentAmount(0)
      return
    }
    calculatePaymentAmount(customAmount, getCurrentPaymentType())
  }

  const handleCustomAmountChange = (value: string) => {
    dispatchAmount({ type: 'edit-custom', value })
    const customAmount = parseCustomAmount(value)
    if (customAmount === 0) {
      setPaymentAmount(0)
      return
    }
    calculatePaymentAmount(customAmount, getCurrentPaymentType())
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setPaymentLoading(method.type)

    try {
      // Validate minimum topup
      const minTopup = Math.max(
        getMinTopupAmount(topupInfo),
        method.min_topup || 0
      )
      if (topupAmount < minTopup) {
        return
      }

      // Calculate payment amount and show confirmation dialog
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Trigger the Alipay create flow: open a blank tab synchronously to preserve
  // the user-gesture context (so Safari does not block the popup) and
  // immediately paint a loading spinner while the API response is pending.
  const startLegacyAlipayPayment = useCallback(async () => {
    const newWindow = openPaymentWindow()
    const data = await processAlipayPayment({
      amount: topupAmount,
    })
    if (data?.pay_data) {
      redirectPaymentWindow(newWindow, data.pay_data)
      setAlipayModalOpen(true)
    } else if (newWindow) {
      newWindow.close()
    }
  }, [processAlipayPayment, topupAmount])

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return

    // Alipay uses a dedicated create endpoint.
    if (selectedPaymentMethod.type === PAYMENT_TYPES.ALIPAY) {
      setConfirmDialogOpen(false)
      if (isMobile) {
        await startLegacyAlipayPayment()
      } else {
        await desktopAlipay.startPayment({
          amount: topupAmount,
          displayAmount: paymentAmount,
        })
      }
      return
    }

    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const success = isPancake
      ? await processWaffoPancakePayment(topupAmount)
      : await processPayment(topupAmount, selectedPaymentMethod.type)

    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  // Handle transfer
  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }

  const handleWaffoMethodSelect = async (_method: unknown, index: number) => {
    const loadingKey = `waffo-${index}`
    setPaymentLoading(loadingKey)

    try {
      await processWaffoPayment(topupAmount, index)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Wallet')}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5'>
            {/* <WalletStatsCard user={user} loading={userLoading} /> */}

            <div
              className={
                showSubscriptionPanel
                  ? 'grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-start'
                  : 'grid gap-4'
              }
            >
              <div id='wallet-add-funds' className='scroll-mt-4'>
                <RechargeFormCard
                  topupInfo={topupInfo}
                  presetAmounts={presetAmounts}
                  selectedPreset={amountState.selection}
                  onSelectPreset={handleSelectPreset}
                  onSelectCustom={handleSelectCustom}
                  topupAmount={topupAmount}
                  customAmount={amountState.customAmount}
                  onCustomAmountChange={handleCustomAmountChange}
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  paymentLoading={paymentLoading}
                  redemptionCode={redemptionCode}
                  onRedemptionCodeChange={setRedemptionCode}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                  topupLink={topupInfo?.topup_link}
                  loading={topupLoading}
                  priceRatio={topupPriceRatio}
                  usdExchangeRate={topupDisplayRate}
                  topupCurrencySymbol={topupCurrencySymbol}
                  onOpenBilling={() => setBillingDialogOpen(true)}
                  creemProducts={topupInfo?.creem_products}
                  enableCreemTopup={topupInfo?.enable_creem_topup}
                  onCreemProductSelect={handleCreemProductSelect}
                  enableWaffoTopup={topupInfo?.enable_waffo_topup}
                  waffoPayMethods={topupInfo?.waffo_pay_methods}
                  waffoMinTopup={topupInfo?.waffo_min_topup}
                  onWaffoMethodSelect={handleWaffoMethodSelect}
                  enableWaffoPancakeTopup={
                    topupInfo?.enable_waffo_pancake_topup
                  }
                />
              </div>

              <SubscriptionPlansCard
                topupInfo={topupInfo}
                onAvailabilityChange={handleSubscriptionAvailabilityChange}
                userQuota={user?.quota}
                onPurchaseSuccess={fetchUser}
              />
            </div>

            {/* <AffiliateRewardsCard
              user={user}
              affiliateLink={affiliateLink}
              onTransfer={() => setTransferDialogOpen(true)}
              complianceConfirmed={
                topupInfo?.payment_compliance_confirmed !== false
              }
              loading={affiliateLoading}
            /> */}
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={
          processing ||
          pancakeProcessing ||
          alipayProcessing ||
          desktopAlipay.processing
        }
        discountRate={getDiscountRate()}
        usdExchangeRate={topupDisplayRate}
        topupCurrencySymbol={topupCurrencySymbol}
      />

      <AlipayPaymentDialog
        open={alipayModalOpen}
        onFinish={() => window.location.reload()}
      />

      <AlipayDesktopPaymentDialog
        state={desktopAlipay.state}
        checking={desktopAlipay.checking}
        onOpenChange={(open) => {
          if (!open) desktopAlipay.closeDialog()
        }}
        onCheckNow={() => {
          void desktopAlipay.checkNow()
        }}
        onRetry={desktopAlipay.retryPayment}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
