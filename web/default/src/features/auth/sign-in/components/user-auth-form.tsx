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
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Phone, Lock, Loader2, KeyRound, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  buildAssertionResult,
  prepareCredentialRequestOptions,
  isPasskeySupported as detectPasskeySupport,
} from '@/lib/passkey'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/dialog'
import { Turnstile } from '@/components/turnstile'
import { login, wechatLoginByCode } from '@/features/auth/api'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { loginFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import { useSmsVerification } from '@/features/auth/hooks/use-sms-verification'
import { beginPasskeyLogin, finishPasskeyLogin } from '@/features/auth/passkey'
import type { AuthFormProps } from '@/features/auth/types'

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: AuthFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [wechatCode, setWeChatCode] = useState('')
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const [loginMode, setLoginMode] = useState<'password' | 'sms'>('password')
  const [showPwd, setShowPwd] = useState(false)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')
  const loginFailedMessage = t('Login failed')

  const { status } = useStatus()
  const passkeyLoginEnabled = Boolean(
    status?.passkey_login ?? status?.data?.passkey_login
  )
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)

  const {
    isSending: isSendingSms,
    secondsLeft: smsSecondsLeft,
    isActive: isSmsActive,
    sendCode: sendSmsLogin,
  } = useSmsVerification({
    turnstileToken,
    validateTurnstile,
  })
  const { handleLoginSuccess, redirectTo2FA } = useAuthRedirect()

  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const passkeyButtonDisabled =
    isPasskeyLoading ||
    !passkeySupported ||
    (requiresLegalConsent && !agreedToLegal)
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const hasOAuthLogin = Boolean(
    status?.github_oauth ||
    status?.discord_oauth ||
    status?.oidc_enabled ||
    status?.linuxdo_oauth ||
    status?.telegram_oauth ||
    (status?.custom_oauth_providers?.length ?? 0) > 0
  )
  const hasAlternativeLogin =
    passkeyLoginEnabled || hasWeChatLogin || hasOAuthLogin

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    detectPasskeySupport()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false))
  }, [])

  const currentSchema = loginMode === 'sms'
    ? z.object({
        username: z.string().min(1, 'Please enter your phone number').regex(/^1[3-9]\d{9}$/, 'Please enter a valid phone number'),
        password: z.string().min(1, 'Please enter the verification code'),
      })
    : loginFormSchema

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: { username: '', password: '' },
  })

  const wechatQrCodeUrl = useMemo(() => {
    return (
      status?.wechat_qrcode ||
      status?.wechat_qr_code ||
      status?.wechat_qrcode_image_url ||
      status?.wechat_qr_code_image_url ||
      status?.wechat_account_qrcode_image_url ||
      status?.WeChatAccountQRCodeImageURL ||
      status?.data?.wechat_qrcode ||
      status?.data?.WeChatAccountQRCodeImageURL ||
      ''
    )
  }, [status])

  async function onSubmit(data: z.infer<typeof currentSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }
    if (!validateTurnstile()) return

    setIsLoading(true)
    try {
      if (loginMode === 'sms') {
        const res = await login({
          username: data.username,
          password: data.password,
          turnstile: turnstileToken,
        })
        if (res.success) {
          if (res.data?.require_2fa) {
            redirectTo2FA()
            return
          }
          await handleLoginSuccess(res.data as { id?: number } | null, redirectTo)
          toast.success(t('Welcome back!'))
        } else {
          toast.error(res?.message || loginFailedMessage)
        }
      } else {
        const res = await login({
          username: data.username,
          password: data.password,
          turnstile: turnstileToken,
        })
        if (res.success) {
          if (res.data?.require_2fa) {
            redirectTo2FA()
            return
          }
          await handleLoginSuccess(res.data as { id?: number } | null, redirectTo)
          toast.success(t('Welcome back!'))
        } else {
          toast.error(res?.message || loginFailedMessage)
        }
      }
    } catch (_error) {
      // Errors are handled by global interceptor
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenWeChatDialog = () => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    setIsWeChatDialogOpen(true)
  }

  const handleWeChatDialogChange = (open: boolean) => {
    setIsWeChatDialogOpen(open)
    if (!open) {
      setWeChatCode('')
      setIsWeChatSubmitting(false)
    }
  }

  async function handleWeChatLogin() {
    if (!wechatCode.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(wechatCode)
      if (res?.success) {
        await handleLoginSuccess(res.data as { id?: number } | null, redirectTo)
        toast.success(t('Signed in via WeChat'))
        handleWeChatDialogChange(false)
      } else {
        toast.error(res?.message || loginFailedMessage)
      }
    } catch (_error) {
      toast.error(loginFailedMessage)
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  async function handlePasskeyLogin() {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    if (!passkeySupported) {
      toast.error(t('Passkey is not supported on this device'))
      return
    }

    if (!navigator?.credentials) {
      toast.error(t('Passkey is not available in this browser'))
      return
    }

    setIsPasskeyLoading(true)
    try {
      const begin = await beginPasskeyLogin()
      if (!begin.success) {
        throw new Error(begin.message || t('Failed to start Passkey login'))
      }

      const publicKey = prepareCredentialRequestOptions(
        begin.data?.options ?? begin.data
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

      const finish = await finishPasskeyLogin(assertion)
      if (!finish.success) {
        throw new Error(finish.message || t('Failed to complete Passkey login'))
      }

      if (!finish.data) {
        throw new Error(t('Missing user data from Passkey login response'))
      }

      await handleLoginSuccess(
        finish.data as { id?: number } | null,
        redirectTo
      )
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

  const alternativeLoginMethods = (
    <>
      {passkeyLoginEnabled && (
        <div className='mt-2 space-y-1'>
          <Button
            type='button'
            variant='outline'
            disabled={passkeyButtonDisabled}
            onClick={handlePasskeyLogin}
            className='h-11 w-full justify-center gap-2 rounded-lg'
          >
            {isPasskeyLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <KeyRound className='h-4 w-4' />
            )}
            {t('Sign in with Passkey')}
          </Button>
          {!passkeySupported && (
            <p className='text-muted-foreground text-xs'>
              {t('Passkey is not supported on this device.')}
            </p>
          )}
        </div>
      )}

      {/* OAuth Providers */}
      <OAuthProviders
        status={status}
        disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
        onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
        isWeChatLoading={isWeChatSubmitting}
      />
    </>
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-5', className)}
        {...props}
      >
        {/* ======== Tab 切换器 ======== */}
        <div className='flex border-b'>
          <button
            type='button'
            onClick={() => {
              setLoginMode('password')
              form.reset({ username: '', password: '' })
            }}
            className={cn(
              'relative flex-1 pb-3 text-center text-sm font-medium transition-colors',
              loginMode === 'password'
                ? 'text-violet-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('Password login')}
            {loginMode === 'password' && (
              <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600' />
            )}
          </button>
          <button
            type='button'
            onClick={() => {
              setLoginMode('sms')
              form.reset({ username: '', password: '' })
            }}
            className={cn(
              'relative flex-1 pb-3 text-center text-sm font-medium transition-colors',
              loginMode === 'sms'
                ? 'text-violet-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('SMS verification login')}
            {loginMode === 'sms' && (
              <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600' />
            )}
          </button>
        </div>

        {/* ======== 密码登录模式 ======== */}
        {loginMode === 'password' && (
          <>
            {/* 用户名/邮箱字段 */}
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='relative'>
                      <User className='text-muted-foreground absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2' />
                      <Input
                        placeholder={t('Enter your username or email')}
                        className='pl-10'
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 密码字段 */}
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='relative'>
                      <Lock className='text-muted-foreground absolute left-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2' />
                      <Input
                        type={showPwd ? 'text' : 'password'}
                        placeholder={t('Enter password')}
                        className='pl-10 pr-10'
                        {...field}
                      />
                      <button
                        type='button'
                        className='text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2'
                        onClick={() => setShowPwd((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPwd ? (
                          <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>
                        ) : (
                          <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 记住我 + 忘记密码 同一行 */}
            <div className='-mt-1 flex items-center justify-between'>
              <label className='flex cursor-pointer items-center gap-2 text-sm'>
                <input type='checkbox' className='border-input h-4 w-4 rounded' />
                <span className='text-muted-foreground'>{t('Remember me')}</span>
              </label>
              <Link
                to='/forgot-password'
                className='text-muted-foreground text-sm hover:underline'
              >
                {t('Forgot password?')}
              </Link>
            </div>

            {/* 登录按钮 - 密码模式 */}
            <Button
              type='submit'
              className='w-full border-0 py-6 text-base font-medium text-white sf-btn-primary disabled:bg-violet-500/50 disabled:text-white/70'
              disabled={
                isLoading ||
                (requiresLegalConsent && !agreedToLegal) ||
                !turnstileReady
              }
            >
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : null}
              {t('Sign in')}
            </Button>
          </>
        )}

        {/* ======== 验证码登录模式 ======== */}
        {loginMode === 'sms' && (
          <>
            {/* 手机号字段 */}
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='relative'>
                      <Phone className='text-muted-foreground absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2' />
                      <Input
                        placeholder={t('Enter your phone number')}
                        type='tel'
                        className='pl-10'
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 验证码字段 */}
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='relative'>
                      <Lock className='text-muted-foreground absolute left-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2' />
                      <Input
                        placeholder={t('Enter verification code')}
                        className='pl-10 pr-[120px]'
                        {...field}
                      />
                      <Button
                        variant='ghost'
                        type='button'
                        size='sm'
                        disabled={
                          isLoading ||
                          isSendingSms ||
                          isSmsActive ||
                          !form.watch('username') ||
                          !turnstileReady
                        }
                        onClick={async () => {
                          await sendSmsLogin(form.watch('username') || '')
                        }}
                        className='absolute right-3 top-0 bottom-0 my-auto flex items-center justify-center text-primary hover:text-primary disabled:cursor-not-allowed h-8'
                      >
                        {isSmsActive ? (
                          t('Resend ({{seconds}}s)', { seconds: smsSecondsLeft })
                        ) : isSendingSms ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          t('Send SMS code')
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 登录按钮 - 验证码模式 */}
            <Button
              type='submit'
              className='w-full border-0 py-6 text-base font-medium text-white sf-btn-primary disabled:bg-violet-500/50 disabled:text-white/70'
              disabled={
                isLoading ||
                (requiresLegalConsent && !agreedToLegal) ||
                !turnstileReady
              }
            >
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : null}
              {t('Sign in')}
            </Button>
          </>
        )}

        {/* Turnstile — 两种模式共用 */}
        {isTurnstileEnabled && (
          <div className='mt-2'>
            <Turnstile siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
          </div>
        )}

        {/* 法律协议 — 两种模式共用 */}
        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          className='mt-1'
        />

        {/* 第三方登录 */}
        {hasAlternativeLogin && alternativeLoginMethods}
      </form>

      {/* 微信扫码弹窗 — 保持不变 */}
      {hasWeChatLogin && (
        <Dialog
          open={isWeChatDialogOpen}
          onOpenChange={handleWeChatDialogChange}
          title={t('WeChat sign in')}
          description={t(
            'Scan the QR code to follow the official account and reply with "验证码" to receive your verification code.'
          )}
          contentClassName='max-w-sm'
          headerClassName='text-left'
          contentHeight='auto'
          bodyClassName='space-y-4'
          footer={
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleWeChatDialogChange(false)}
                disabled={isWeChatSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleWeChatLogin}
                disabled={
                  isWeChatSubmitting ||
                  !wechatCode.trim() ||
                  (requiresLegalConsent && !agreedToLegal)
                }
                className='gap-2'
              >
                {isWeChatSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {t('Confirm')}
              </Button>
            </>
          }
        >
          {wechatQrCodeUrl ? (
            <div className='flex justify-center'>
              <img
                src={wechatQrCodeUrl}
                alt={t('WeChat login QR code')}
                className='h-40 w-40 rounded-md border object-contain'
              />
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('QR code is not configured. Please contact support.')}
            </p>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
            <Input
              id='wechat-code'
              placeholder={t('Enter the verification code')}
              value={wechatCode}
              onChange={(event) => setWeChatCode(event.target.value)}
              autoComplete='one-time-code'
            />
          </div>
        </Dialog>
      )}
    </Form>
  )
}
