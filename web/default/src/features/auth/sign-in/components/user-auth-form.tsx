import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { KeyRound, Loader2 } from 'lucide-react'
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
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { login } from '@/features/auth/api'
import { SIGN_IN_INPUT_CLASS } from '@/features/auth/components/auth-form-styles'
import { AuthPasswordInput } from '@/features/auth/components/auth-password-input'
import { HumanVerificationField } from '@/features/auth/components/human-verification-field'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { WeChatLoginDialog } from '@/features/auth/components/wechat-login-dialog'
import {
  isValidMainlandChinaPhone,
  loginFormSchema,
  MAINLAND_CHINA_PHONE_REGEX,
} from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useHumanVerification } from '@/features/auth/hooks/use-human-verification'
import { useSmsVerification } from '@/features/auth/hooks/use-sms-verification'
import { beginPasskeyLogin, finishPasskeyLogin } from '@/features/auth/passkey'
import type { AuthFormProps } from '@/features/auth/types'
import { useStatus } from '@/hooks/use-status'
import {
  buildAssertionResult,
  isPasskeySupported as detectPasskeySupport,
  prepareCredentialRequestOptions,
} from '@/lib/passkey'
import { cn } from '@/lib/utils'

import {
  DEFAULT_LOGIN_MODE,
  isPasswordLoginAvailable,
  isRegistrationEntryVisible,
  type LoginMode,
} from '../lib/login-page-options'
import { LoginModeTabs } from './login-mode-tabs'

const smsLoginFormSchema = z.object({
  username: z
    .string()
    .min(1, 'Please enter your phone number')
    .regex(MAINLAND_CHINA_PHONE_REGEX, 'Please enter a valid phone number'),
  password: z.string().min(1, 'Please enter the verification code'),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: AuthFormProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { handleLoginSuccess, redirectTo2FA } = useAuthRedirect()
  const [loginMode, setLoginMode] = useState<LoginMode>(DEFAULT_LOGIN_MODE)
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)

  const passwordLoginEnabled = isPasswordLoginAvailable(status)
  const showRegisterEntry = isRegistrationEntryVisible(status)
  const passkeyLoginEnabled = Boolean(
    status?.passkey_login ?? status?.data?.passkey_login
  )
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const hasOAuthLogin = Boolean(
    status?.github_oauth ||
    status?.discord_oauth ||
    status?.oidc_enabled ||
    status?.linuxdo_oauth ||
    (status?.custom_oauth_providers?.length ?? 0) > 0
  )
  const hasAlternativeLogin =
    passkeyLoginEnabled || hasWeChatLogin || hasOAuthLogin
  const legalConsentMissing = requiresLegalConsent && !agreedToLegal

  const currentSchema = useMemo(
    () => (loginMode === 'sms' ? smsLoginFormSchema : loginFormSchema),
    [loginMode]
  )
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: { username: '', password: '' },
  })

  const humanVerification = useHumanVerification()
  const {
    isSending: isSendingSms,
    secondsLeft: smsSecondsLeft,
    isActive: isSmsActive,
    sendCode: sendSmsLogin,
  } = useSmsVerification()
  const smsButtonLabel = isSmsActive
    ? t('Resend ({{seconds}}s)', { seconds: smsSecondsLeft })
    : t('Send code')

  useEffect(() => {
    setAgreedToLegal(!requiresLegalConsent)
  }, [requiresLegalConsent])

  useEffect(() => {
    detectPasskeySupport()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false))
  }, [])

  const switchLoginMode = (nextMode: LoginMode) => {
    setLoginMode(nextMode)
    form.reset({ username: '', password: '' })
  }

  const onSubmit = async (data: LoginFormValues) => {
    if (legalConsentMissing) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    const verification = await humanVerification.verify()
    if (!verification) return

    setIsLoading(true)
    try {
      const response = await login({
        username: data.username,
        password: data.password,
        ...verification,
      })
      if (!response.success) {
        toast.error(response.message || t('Login failed'))
        return
      }
      if (response.data?.require_2fa) {
        redirectTo2FA()
        return
      }

      await handleLoginSuccess(response.data ?? null, redirectTo)
      toast.success(t('Welcome back!'))
    } catch {
      // The global API interceptor reports transport errors.
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    if (legalConsentMissing) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    if (!passkeySupported || !navigator?.credentials) {
      toast.error(t('Passkey is not supported on this device'))
      return
    }

    setIsPasskeyLoading(true)
    try {
      const beginResponse = await beginPasskeyLogin()
      if (!beginResponse.success) {
        throw new Error(
          beginResponse.message || t('Failed to start Passkey login')
        )
      }

      const publicKey = prepareCredentialRequestOptions(
        beginResponse.data?.options ?? beginResponse.data
      )
      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null
      if (!credential) {
        toast.info(t('Passkey login was cancelled'))
        return
      }

      const assertion = buildAssertionResult(credential)
      if (!assertion) {
        throw new Error(t('Invalid Passkey response'))
      }

      const finishResponse = await finishPasskeyLogin(assertion)
      if (!finishResponse.success || !finishResponse.data) {
        throw new Error(
          finishResponse.message || t('Failed to complete Passkey login')
        )
      }

      await handleLoginSuccess(finishResponse.data, redirectTo)
      toast.success(t('Signed in with Passkey'))
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.info(t('Passkey login was cancelled or timed out'))
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('Passkey login failed'))
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        {passwordLoginEnabled ? (
          <>
            <LoginModeTabs mode={loginMode} onModeChange={switchLoginMode} />

            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type={loginMode === 'sms' ? 'tel' : 'text'}
                      inputMode={loginMode === 'sms' ? 'numeric' : 'text'}
                      maxLength={loginMode === 'sms' ? 11 : undefined}
                      autoComplete={loginMode === 'sms' ? 'tel' : 'username'}
                      aria-label={
                        loginMode === 'sms'
                          ? t('Phone number')
                          : t('Username or email')
                      }
                      placeholder={
                        loginMode === 'sms'
                          ? t('Enter your phone number')
                          : t('Enter your username, email, or phone number')
                      }
                      className={SIGN_IN_INPUT_CLASS}
                      {...field}
                    />
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
                    {loginMode === 'password' ? (
                      <AuthPasswordInput
                        showLeadingIcon={false}
                        autoComplete='current-password'
                        aria-label={t('Password')}
                        placeholder={t('Enter password')}
                        className={SIGN_IN_INPUT_CLASS}
                        {...field}
                      />
                    ) : (
                      <div className='relative'>
                        <Input
                          inputMode='numeric'
                          autoComplete='one-time-code'
                          maxLength={6}
                          aria-label={t('Verification code')}
                          placeholder={t('Enter verification code')}
                          className={cn(SIGN_IN_INPUT_CLASS, 'pr-[104px]')}
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          disabled={
                            isLoading ||
                            isSendingSms ||
                            isSmsActive ||
                            !isValidMainlandChinaPhone(
                              form.watch('username')
                            ) ||
                            !humanVerification.isReady
                          }
                          onClick={() =>
                            sendSmsLogin(form.getValues('username'))
                          }
                          className='text-primary hover:bg-primary/10 hover:text-primary absolute top-1/2 right-2 h-9 -translate-y-1/2 rounded-lg px-2'
                        >
                          {isSendingSms ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            smsButtonLabel
                          )}
                        </Button>
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <div className='rounded-2xl border border-[#ecefeb] bg-[#f7f9f7] p-4 text-sm text-[#6f7874] dark:border-white/10 dark:bg-white/5 dark:text-white/65'>
            {t('Password login is currently unavailable.')}
          </div>
        )}

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          variant='inline'
        />

        {passwordLoginEnabled ? (
          <>
            <HumanVerificationField verification={humanVerification} />

            <Button
              type='submit'
              disabled={
                isLoading || legalConsentMissing || !humanVerification.isReady
              }
              className='sf-btn-primary h-12 w-full rounded-xl border-0 text-base font-semibold transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none'
            >
              {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
              {t('Sign in now')}
            </Button>

            {loginMode === 'password' || showRegisterEntry ? (
              <div className='-mt-1 flex min-h-5 items-center justify-between gap-4 text-sm'>
                {loginMode === 'password' ? (
                  <Link
                    to='/forgot-password'
                    className='text-primary focus-visible:ring-primary/40 rounded-sm transition-opacity outline-none hover:opacity-80 focus-visible:ring-2'
                  >
                    {t('Forgot password?')}
                  </Link>
                ) : (
                  <span aria-hidden='true' />
                )}
                {showRegisterEntry ? (
                  <Link
                    to='/sign-up'
                    className='text-primary focus-visible:ring-primary/40 rounded-sm transition-opacity outline-none hover:opacity-80 focus-visible:ring-2'
                  >
                    {t('Sign up')}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {hasAlternativeLogin ? (
          <div className='space-y-4 pt-1'>
            <div className='flex items-center gap-3 text-xs text-[#9aa29e]'>
              <span className='h-px flex-1 bg-[#edf0ec] dark:bg-white/10' />
              <span>{t('Quick sign in')}</span>
              <span className='h-px flex-1 bg-[#edf0ec] dark:bg-white/10' />
            </div>
            <div className='flex flex-wrap justify-center gap-3'>
              {passkeyLoginEnabled ? (
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  disabled={
                    isPasskeyLoading || !passkeySupported || legalConsentMissing
                  }
                  onClick={handlePasskeyLogin}
                  className='h-11 w-11 rounded-full border-[#e8ece9] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#ffc47f] hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8'
                  aria-label={t('Sign in with Passkey')}
                  title={t('Sign in with Passkey')}
                >
                  {isPasskeyLoading ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <KeyRound className='h-4 w-4' />
                  )}
                </Button>
              ) : null}
              <OAuthProviders
                status={status}
                appearance='compact'
                showDivider={false}
                disabled={isLoading || legalConsentMissing}
                onWeChatLogin={
                  hasWeChatLogin ? () => setIsWeChatDialogOpen(true) : undefined
                }
              />
            </div>
          </div>
        ) : null}
      </form>

      {hasWeChatLogin ? (
        <WeChatLoginDialog
          status={status}
          open={isWeChatDialogOpen}
          onOpenChange={setIsWeChatDialogOpen}
          redirectTo={redirectTo}
        />
      ) : null}
    </Form>
  )
}
