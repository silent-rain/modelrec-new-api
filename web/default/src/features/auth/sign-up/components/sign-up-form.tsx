import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
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
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { register } from '@/features/auth/api'
import { AUTH_INPUT_CLASS } from '@/features/auth/components/auth-form-styles'
import { AuthPasswordInput } from '@/features/auth/components/auth-password-input'
import { HumanVerificationField } from '@/features/auth/components/human-verification-field'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { WeChatLoginDialog } from '@/features/auth/components/wechat-login-dialog'
import {
  isValidMainlandChinaPhone,
  registerFormSchema,
  type RegisterFormValues,
} from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useHumanVerification } from '@/features/auth/hooks/use-human-verification'
import { useSmsVerification } from '@/features/auth/hooks/use-sms-verification'
import { buildRegisterPayload } from '@/features/auth/lib/registration'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { redirectToLogin } = useAuthRedirect()
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)

  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const legalConsentMissing = requiresLegalConsent && !agreedToLegal
  const emailRegistrationEnabled = Boolean(status?.email_verification)
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const hasOAuthLogin = Boolean(
    status?.github_oauth ||
    status?.discord_oauth ||
    status?.oidc_enabled ||
    status?.linuxdo_oauth ||
    (status?.custom_oauth_providers?.length ?? 0) > 0
  )
  const hasAlternativeRegistration = hasWeChatLogin || hasOAuthLogin

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      registrationMethod: 'phone',
      username: '',
      phone: '',
      email: '',
      verification_code: '',
      password: '',
      confirmPassword: '',
    },
  })
  const registrationMethod = useWatch({
    control: form.control,
    name: 'registrationMethod',
  })
  const phoneValue = useWatch({ control: form.control, name: 'phone' })
  const emailValue = useWatch({ control: form.control, name: 'email' })

  const humanVerification = useHumanVerification()
  const {
    isSending: isSendingSms,
    secondsLeft: smsSecondsLeft,
    isActive: isSmsActive,
    sendCode: sendSms,
  } = useSmsVerification()
  const {
    isSending: isSendingEmail,
    secondsLeft: emailSecondsLeft,
    isActive: isEmailActive,
    sendCode: sendEmail,
  } = useEmailVerification({ getVerification: humanVerification.verify })
  const smsButtonLabel = isSmsActive
    ? t('Resend ({{seconds}}s)', { seconds: smsSecondsLeft })
    : t('Send code')
  const emailButtonLabel = isEmailActive
    ? t('Resend ({{seconds}}s)', { seconds: emailSecondsLeft })
    : t('Send code')
  let verificationButtonContent: React.ReactNode =
    registrationMethod === 'phone' ? smsButtonLabel : emailButtonLabel
  if (isSendingSms || isSendingEmail) {
    verificationButtonContent = <Loader2 className='h-4 w-4 animate-spin' />
  }

  useEffect(() => {
    setAgreedToLegal(!requiresLegalConsent)
  }, [requiresLegalConsent])

  useEffect(() => {
    const affiliateCode = new URLSearchParams(window.location.search)
      .get('aff')
      ?.trim()
    if (affiliateCode) {
      saveAffiliateCode(affiliateCode)
    }
  }, [])

  const switchRegistrationMethod = (method: 'phone' | 'email') => {
    if (method === registrationMethod) return
    form.setValue('registrationMethod', method)
    form.setValue('verification_code', '')
    if (method === 'phone') {
      form.setValue('email', '')
    } else {
      form.setValue('phone', '')
    }
    form.clearErrors(['phone', 'email', 'verification_code'])
  }

  const handleSendVerificationCode = async () => {
    if (registrationMethod === 'email') {
      const emailValid = await form.trigger('email')
      if (emailValid) await sendEmail(emailValue || '')
      return
    }
    await sendSms(phoneValue || '')
  }

  const onSubmit = async (data: RegisterFormValues) => {
    if (legalConsentMissing) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    const verification = await humanVerification.verify()
    if (!verification) return

    setIsLoading(true)
    try {
      const response = await register(
        buildRegisterPayload(data, getAffiliateCode(), verification)
      )
      if (!response?.success) {
        toast.error(response?.message || t('Failed to create account'))
        return
      }

      toast.success(t('Account created! Please sign in'))
      redirectToLogin()
    } catch {
      // The global API interceptor reports transport errors.
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        {emailRegistrationEnabled ? (
          <div
            className='grid grid-cols-2 rounded-xl bg-[#f2f5f3] p-1 dark:bg-white/5'
            role='tablist'
            aria-label={t('Registration method')}
          >
            {(['phone', 'email'] as const).map((method) => {
              const active = registrationMethod === method
              return (
                <button
                  key={method}
                  type='button'
                  role='tab'
                  aria-selected={active}
                  onClick={() => switchRegistrationMethod(method)}
                  className={cn(
                    'h-10 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200',
                    active
                      ? 'bg-white text-[#ed8100] shadow-sm dark:bg-white/10'
                      : 'text-[#78817d] hover:text-[#39413d] dark:text-white/55 dark:hover:text-white/80'
                  )}
                >
                  {method === 'phone'
                    ? t('Register with phone')
                    : t('Register with email')}
                </button>
              )
            })}
          </div>
        ) : null}

        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className='relative'>
                  <UserRound
                    className='pointer-events-none absolute top-1/2 left-4 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#a6afab]'
                    aria-hidden='true'
                  />
                  <Input
                    autoComplete='username'
                    aria-label={t('Username')}
                    placeholder={t('Enter your username')}
                    className={AUTH_INPUT_CLASS}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {registrationMethod === 'phone' ? (
          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className='relative'>
                    <Phone
                      className='pointer-events-none absolute top-1/2 left-4 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#a6afab]'
                      aria-hidden='true'
                    />
                    <Input
                      type='tel'
                      inputMode='numeric'
                      autoComplete='tel'
                      maxLength={11}
                      aria-label={t('Phone number')}
                      placeholder={t('Enter your phone number')}
                      className={AUTH_INPUT_CLASS}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className='relative'>
                    <Mail
                      className='pointer-events-none absolute top-1/2 left-4 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#a6afab]'
                      aria-hidden='true'
                    />
                    <Input
                      type='email'
                      inputMode='email'
                      autoComplete='email'
                      aria-label={t('Email')}
                      placeholder={t('Enter your email')}
                      className={AUTH_INPUT_CLASS}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='verification_code'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className='relative'>
                  <ShieldCheck
                    className='pointer-events-none absolute top-1/2 left-4 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#a6afab]'
                    aria-hidden='true'
                  />
                  <Input
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    maxLength={6}
                    aria-label={t('Verification code')}
                    placeholder={t('Enter verification code')}
                    className={`${AUTH_INPUT_CLASS} pr-[104px]`}
                    {...field}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    disabled={
                      isLoading ||
                      !humanVerification.isReady ||
                      (registrationMethod === 'phone'
                        ? isSendingSms ||
                          isSmsActive ||
                          !isValidMainlandChinaPhone(phoneValue || '')
                        : isSendingEmail || isEmailActive || !emailValue)
                    }
                    onClick={handleSendVerificationCode}
                    className='absolute top-1/2 right-3 h-10 -translate-y-1/2 rounded-lg px-2 text-[#ed8100] hover:bg-[#fff3e5] hover:text-[#d87300]'
                  >
                    {verificationButtonContent}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <AuthPasswordInput
                  autoComplete='new-password'
                  aria-label={t('Password')}
                  placeholder={t('Create a password of 8–20 characters')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <AuthPasswordInput
                  autoComplete='new-password'
                  aria-label={t('Confirm password')}
                  placeholder={t('Confirm your password')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <HumanVerificationField verification={humanVerification} />

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          variant='inline'
        />

        <Button
          type='submit'
          disabled={
            isLoading || legalConsentMissing || !humanVerification.isReady
          }
          className='sf-btn-primary h-14 w-full rounded-2xl border-0 text-base font-semibold transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none'
        >
          {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          {t('Create account')}
        </Button>

        {hasAlternativeRegistration ? (
          <OAuthProviders
            status={status}
            appearance='compact'
            disabled={isLoading || legalConsentMissing}
            onWeChatLogin={
              hasWeChatLogin ? () => setIsWeChatDialogOpen(true) : undefined
            }
          />
        ) : null}
      </form>

      {hasWeChatLogin ? (
        <WeChatLoginDialog
          status={status}
          open={isWeChatDialogOpen}
          onOpenChange={setIsWeChatDialogOpen}
        />
      ) : null}
    </Form>
  )
}
