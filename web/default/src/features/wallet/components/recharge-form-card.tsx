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
import { useState, useEffect, useRef } from 'react'
import { Gift, ExternalLink, Loader2, Receipt, WalletCards, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatCurrency,
  getDiscountLabel,
  getPaymentIcon,
  getMinTopupAmount,
  calculatePresetPricing,
} from '../lib'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  onOpenBilling?: () => void
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
}

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  onOpenBilling,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(topupAmount.toString())
  // Separate state for custom amount input, independent from preset selection
  const [customAmount, setCustomAmount] = useState('')
  const customInputRef = useRef<HTMLInputElement>(null)
  const [isCustomAmountSelected, setIsCustomAmountSelected] = useState(false)

  useEffect(() => {
    setLocalAmount(topupAmount.toString())
    // Don't sync custom amount when preset is selected - keep it separate
  }, [topupAmount])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const { valid, numValue } = validateAmountInput(value)
    if (!valid) {
      onTopupAmountChange(0)
    } else {
      onTopupAmountChange(numValue)
    }
  }

  const handleCustomAmountChange = (value: string) => {
    const { valid, sanitized, numValue } = validateAmountInput(value)
    setCustomAmount(sanitized)
    if (!valid) {
      onTopupAmountChange(0)
    } else {
      onTopupAmountChange(numValue)
    }
  }

  /**
   * Validate and format input value for amount fields.
   * Rules:
   * - Only allow positive numbers (no negative sign)
   * - Allow up to 2 decimal places
   * - Reject empty or invalid values
   */
  const validateAmountInput = (value: string): { valid: boolean; sanitized: string; numValue: number } => {
    let sanitized = value

    // Block negative sign completely
    if (sanitized.includes('-')) {
      return { valid: false, sanitized: '', numValue: NaN }
    }

    // Only allow digits and single decimal point
    if (!/^\d*\.?\d*$/.test(sanitized)) {
      return { valid: false, sanitized: '', numValue: NaN }
    }

    // Limit to 2 decimal places
    const parts = sanitized.split('.')
    if (parts[1] && parts[1].length > 2) {
      sanitized = `${parts[0]}.${parts[1].slice(0, 2)}`
    }

    // Remove leading zeros but keep "0.xxx"
    if (/^0\d/.test(sanitized) && !sanitized.startsWith('0.')) {
      sanitized = sanitized.replace(/^0+/, '')
    }

    const numValue = parseFloat(sanitized)
    const valid = !isNaN(numValue) && numValue > 0 && sanitized.length > 0

    return { valid, sanitized, numValue }
  }

  const isCustomAmountValid = (): boolean => {
    if (!customAmount.trim()) return false
    const numValue = parseFloat(customAmount)
    return !isNaN(numValue) && numValue > 0
  }

  const handleCustomCardClick = () => {
    setIsCustomAmountSelected(true)
    onSelectPreset({ value: -1, discount: 1, name: 'Custom', icon: '', type: '' } as PresetAmount)
    // Sync custom amount to main amount when switching to custom mode
    if (isCustomAmountValid()) {
      onTopupAmountChange(parseFloat(customAmount))
    }
    // Auto focus the custom amount input
    setTimeout(() => customInputRef.current?.focus(), 0)
  }

  const handlePresetClick = (preset: PresetAmount) => {
    setIsCustomAmountSelected(false)
    setCustomAmount('') // Clear custom amount when selecting preset
    onSelectPreset(preset)
  }

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup
  const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
  const hasStandardPaymentMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)
  const redemptionEnabled = topupInfo?.enable_redemption !== false

  if (loading) {
    return (
      <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='mt-2 h-4 w-48' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:space-y-6 sm:p-5'>
          <div className='space-y-4 sm:space-y-6'>
            {/* Preset Amounts Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-16' />
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className='h-[72px] rounded-lg' />
                ))}
              </div>
            </div>

            {/* Custom Amount Input Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-[42px] w-full' />
            </div>

            {/* Payment Methods Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-32' />
              <div className='flex flex-wrap gap-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-24 rounded-lg' />
                ))}
              </div>
            </div>
          </div>

          {/* Redemption Code Section Skeleton */}
          <div className='space-y-3 border-t pt-8'>
            <Skeleton className='h-3 w-24' />
            <div className='flex gap-2'>
              <Skeleton className='h-10 flex-1' />
              <Skeleton className='h-10 w-20' />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TitledCard
      title={t('Add Funds')}
      description={t('Choose alipay amount')}
      icon={<WalletCards className='h-4 w-4' />}
      disableHoverEffect
      action={
        onOpenBilling ? (
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenBilling}
            className='w-full gap-2 sm:w-auto'
          >
            <Receipt className='h-4 w-4' />
            {t('Order History')}
          </Button>
        ) : null
      }
      contentClassName='space-y-4 sm:space-y-6'
    >
      {/* Online Topup Section - New Amount Card Layout */}
      {hasAnyTopup ? (
        <div className='space-y-4 sm:space-y-6'>
          {hasConfigurableTopup && (
            <>
              {presetAmounts.length > 0 && (
                <div className='space-y-2.5 sm:space-y-3'>
                  <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                    {t('Amount')}
                  </Label>
                  <div className='grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4'>
                    {presetAmounts.map((preset, index) => {
                      const discount =
                        preset.discount ||
                        topupInfo?.discount?.[preset.value] ||
                        1.0
                      const {
                        displayValue,
                        actualPrice,
                        savedAmount,
                        hasDiscount,
                      } = calculatePresetPricing(
                        preset.value,
                        priceRatio,
                        discount,
                        usdExchangeRate
                      )
                      return (
                        <Button
                          key={index}
                          variant='outline'
                          className={cn(
                            'flex min-h-16 flex-col items-start rounded-lg px-3 py-2.5 text-left whitespace-normal sm:min-h-[72px] sm:p-4',
                            selectedPreset === preset.value
                              ? 'border-foreground bg-foreground/5 dark:border-foreground dark:bg-foreground/10'
                              : 'border-muted'
                          )}
                          onClick={() => onSelectPreset(preset)}
                        >
                          <div className='flex w-full items-center justify-between'>
                            <div className='text-base font-semibold sm:text-lg'>
                              {formatNumber(displayValue)}
                            </div>
                            {hasDiscount && (
                              <div className='text-xs font-medium text-green-600'>
                                {getDiscountLabel(discount)}
                              </div>
                            )}
                          </div>
                          <div className='text-muted-foreground mt-1.5 w-full text-xs sm:mt-2'>
                            Pay {formatCurrency(actualPrice)}
                            {hasDiscount && savedAmount > 0 && (
                              <span className='text-green-600'>
                                {' '}
                                • Save {formatCurrency(savedAmount)}
                              </span>
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className='space-y-2.5 sm:space-y-3'>
                <Label
                  htmlFor='topup-amount'
                  className='text-muted-foreground text-xs font-medium tracking-wider uppercase'
                >
                  {t('Custom Amount')}
                </Label>
                <div className='grid grid-cols-[minmax(0,1fr)_minmax(110px,0.55fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
                  <Input
                    id='topup-amount'
                    type='number'
                    value={localAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    min={minTopup}
                    placeholder={`Minimum ${minTopup}`}
                    className='h-9 text-base sm:h-10 sm:text-lg'
                  />
                  <div className='bg-muted/30 flex min-h-9 items-center justify-between gap-2 rounded-md border px-3 lg:min-w-52'>
                    <span className='text-muted-foreground truncate text-xs'>
                      {t('Amount to pay:')}
                    </span>
                    {calculating ? (
                      <Skeleton className='h-5 w-16' />
                    ) : (
                      <span className='text-sm font-semibold'>
                        {formatCurrency(paymentAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='space-y-2.5 sm:space-y-3'>
                <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                  {t('Payment Method')}
                </Label>
                {hasStandardPaymentMethods ? (
                  <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
                    {topupInfo?.pay_methods?.map((method) => {
                      const minTopup = method.min_topup || 0
                      const disabled = minTopup > topupAmount
                      const disabledReason = disabled
                        ? t('Minimum topup amount: {{amount}}', {
                            amount: minTopup,
                          })
                        : undefined
                      const disabledLabel = disabled
                        ? `${t('Minimum:')} ${minTopup}`
                        : undefined

                      const button = (
                        <Button
                          key={method.type}
                          variant='outline'
                          onClick={() => onPaymentMethodSelect(method)}
                          disabled={disabled || !!paymentLoading}
                          title={disabledReason}
                          aria-label={
                            disabledReason
                              ? `${method.name}. ${disabledReason}`
                              : method.name
                          }
                          className='min-h-14 min-w-0 justify-start gap-2 rounded-lg px-3 py-2 text-left'
                        >
                          {paymentLoading === method.type ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            getPaymentIcon(
                              method.type,
                              'h-4 w-4',
                              method.icon,
                              method.name
                            )
                          )}
                          <span className='flex min-w-0 flex-col items-start gap-0.5'>
                            <span className='max-w-full truncate'>
                              {method.name}
                            </span>
                            {disabledLabel && (
                              <span className='text-muted-foreground max-w-full truncate text-[11px] leading-4 font-normal'>
                                {disabledLabel}
                              </span>
                            )}
                          </span>
                        </Button>
                      )

                      return disabled ? (
                        <TooltipProvider key={method.type}>
                          <Tooltip>
                            <TooltipTrigger render={button}></TooltipTrigger>
                            <TooltipContent>{disabledReason}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        button
                      )
                    })}
                  </div>
                ) : hasWaffoPaymentMethods ? null : (
                  <Alert>
                    <AlertDescription>
                      {t(
                        'No payment methods available. Please contact administrator.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {enableWaffoTopup &&
                hasWaffoPaymentMethods &&
                onWaffoMethodSelect && (
                  <div className='space-y-2.5 sm:space-y-3'>
                    <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                      {t('Waffo Payment')}
                    </Label>
                    <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
                      {waffoPayMethods?.map((method, index) => {
                        const loadingKey = `waffo-${index}`
                        const waffoMin = waffoMinTopup || 0
                        const belowMin = waffoMin > topupAmount
                        const disabledReason = belowMin
                          ? t('Minimum topup amount: {{amount}}', {
                              amount: waffoMin,
                            })
                          : undefined
                        const disabledLabel = belowMin
                          ? `${t('Minimum:')} ${waffoMin}`
                          : undefined

                        const button = (
                          <Button
                            key={`${method.name}-${index}`}
                            variant='outline'
                            onClick={() => onWaffoMethodSelect(method, index)}
                            disabled={belowMin || !!paymentLoading}
                            title={disabledReason}
                            aria-label={
                              disabledReason
                                ? `${method.name}. ${disabledReason}`
                                : method.name
                            }
                            className='min-h-14 min-w-0 justify-start gap-2 rounded-lg px-3 py-2 text-left'
                          >
                            {paymentLoading === loadingKey ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : method.icon ? (
                              <img
                                src={method.icon}
                                alt={method.name}
                                className='h-4 w-4 object-contain'
                              />
                            ) : (
                              getPaymentIcon('waffo')
                            )}
                            <span className='flex min-w-0 flex-col items-start gap-0.5'>
                              <span className='max-w-full truncate'>
                                {method.name}
                              </span>
                              {disabledLabel && (
                                <span className='text-muted-foreground max-w-full truncate text-[11px] leading-4 font-normal'>
                                  {disabledLabel}
                                </span>
                              )}
                            </span>
                          </Button>
                        )

                        return belowMin ? (
                          <TooltipProvider key={`${method.name}-${index}`}>
                            <Tooltip>
                              <TooltipTrigger render={button}></TooltipTrigger>
                              <TooltipContent>{disabledReason}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          button
                        )
                      })}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        // {/* Original Alert: Online topup not enabled - replaced with amount card layout */}
        // <Alert>
        //   <AlertDescription>
        //     {t(
        //       'Online topup is not enabled. Please use redemption code or contact administrator.'
        //     )}
        //   </AlertDescription>
        // </Alert>

        /* New Amount Card Layout with custom amount input */
        <div className='space-y-4 sm:space-y-6'>
          {/* Preset amount cards + Custom amount input in same row */}
          <div className='space-y-3'>
            <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              {t('Select Top-up Amount')}
            </Label>
            <div className='grid grid-cols-2 gap-3 lg:grid-cols-5'>
              {/* Preset amount cards - use div for consistent selection style */}
              {[
                { value: 50, label: '基础充值', isHot: false },
                { value: 100, label: '日常选用', isHot: false },
                { value: 500, label: '热门选择', isHot: true },
                { value: 1000, label: '超值套餐', isHot: false },
              ].map((item) => (
                <div
                  key={item.value}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-4 py-6 text-center transition-all min-h-[90px] justify-center',
                    selectedPreset === item.value && !isCustomAmountSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-muted hover:border-primary/50'
                  )}
                  onClick={() => handlePresetClick({
                    value: item.value,
                    discount: 1,
                    name: `${item.label}`,
                    icon: '',
                    type: '',
                  } as PresetAmount)}
                >
                  {item.isHot && (
                    <span className='absolute right-2 top-2 bg-red-500 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white'>
                      最热
                    </span>
                  )}
                  <span className={cn(
                    'text-lg font-semibold',
                    selectedPreset === item.value && !isCustomAmountSelected
                      ? 'text-primary'
                      : ''
                  )}>¥{item.value}</span>
                  <span className='text-muted-foreground text-xs leading-tight'>
                    {item.label}
                  </span>
                </div>
              ))}

              {/* Custom amount input card - same selection style */}
              <div
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border px-4 py-6 text-center cursor-pointer transition-all min-h-[90px] justify-center',
                  isCustomAmountSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-muted hover:border-primary/50'
                )}
                onClick={handleCustomCardClick}
              >
                {/* ¥ symbol + Input value on top - same style as preset amount */}
                <div className='flex items-center justify-center gap-0.5'>
                  <span className='text-lg font-semibold'>¥</span>
                  <Input
                    ref={customInputRef}
                    id='custom-topup-amount'
                    type='number'
                    step='0.01'
                    min={0.01}
                    value={customAmount}
                    onChange={(e) => {
                      handleCustomAmountChange(e.target.value)
                      // Select this card when user types in it
                      if (!isCustomAmountSelected) {
                        setIsCustomAmountSelected(true)
                        onSelectPreset({ value: -1, discount: 1, name: 'Custom', icon: '', type: '' } as PresetAmount)
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Also select card when clicking input directly
                      if (!isCustomAmountSelected) {
                        setIsCustomAmountSelected(true)
                        onSelectPreset({ value: -1, discount: 1, name: 'Custom', icon: '', type: '' } as PresetAmount)
                      }
                    }}
                    onFocus={() => {
                      if (!isCustomAmountSelected) {
                        setIsCustomAmountSelected(true)
                        onSelectPreset({ value: -1, discount: 1, name: 'Custom', icon: '', type: '' } as PresetAmount)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Block minus sign completely
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault()
                      }
                    }}
                    placeholder={t('Enter Amount')}
                    className='[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-moz-appearance:textfield] text-lg font-semibold w-full text-center border-none shadow-none focus-visible:ring-0 p-0 bg-transparent'
                  />
                </div>
                {/* Label with icon below - same style as preset description */}
                <div className='flex items-center gap-1'>
                  <span className='text-muted-foreground text-xs leading-tight'>
                    {t('Custom Amount')}
                  </span>
                  <Pencil className='text-muted-foreground h-3.5 w-3.5' />
                </div>
              </div>
            </div>
          </div>

          {/* Pay button */}
          <Button
            size='lg'
            disabled={topupAmount <= 0 || !!paymentLoading || (isCustomAmountSelected && !isCustomAmountValid())}
            className='w-full h-12 text-base font-semibold'
          >
            {paymentLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
            {t('Pay Now')}
          </Button>
        </div>
      )}

      {/* Creem Products Section */}
      {enableCreemTopup &&
        Array.isArray(creemProducts) &&
        creemProducts.length > 0 &&
        onCreemProductSelect && (
          <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-6'>
            <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              {t('Creem Payment')}
            </Label>
            <CreemProductsSection
              products={creemProducts}
              onProductSelect={onCreemProductSelect}
            />
          </div>
        )}

      {/* Redemption Code Section */}
      {redemptionEnabled ? (
        <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-6'>
          <div className='flex items-center gap-2'>
            <Gift className='text-muted-foreground h-4 w-4' />
            <Label
              htmlFor='redemption-code'
              className='text-muted-foreground text-xs font-medium tracking-wider uppercase'
            >
              {t('Have a Code?')}
            </Label>
          </div>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
            <Input
              id='redemption-code'
              value={redemptionCode}
              onChange={(e) => onRedemptionCodeChange(e.target.value)}
              placeholder={t('Enter your redemption code')}
              className='h-9 min-w-0'
            />
            <Button
              onClick={onRedeem}
              disabled={redeeming}
              variant='outline'
              className='h-9 px-4'
            >
              {redeeming && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('Redeem')}
            </Button>
          </div>
          {topupLink && (
            <p className='text-muted-foreground text-xs'>
              {t('Need a redemption code?')}{' '}
              <a
                href={topupLink}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 underline-offset-4 hover:underline'
              >
                {t('Get one here')}
                <ExternalLink className='h-3 w-3' />
              </a>
            </p>
          )}
        </div>
      ) : (
        // {/* Original Alert: Redemption codes disabled - keep as comment */}
        // <Alert className='border-t'>
        //   <AlertDescription>
        //     {t(
        //       'Redemption codes are disabled until the administrator confirms compliance terms.'
        //     )}
        //   </AlertDescription>
        // </Alert>

        /* Empty state - redemption disabled, no extra UI needed */
        null
      )}
    </TitledCard>
  )
}
