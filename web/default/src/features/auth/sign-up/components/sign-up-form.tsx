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
import type { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, User, Phone, Lock, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/dialog'
import { PasswordInput } from '@/components/password-input'
import { Turnstile } from '@/components/turnstile'
import { register, wechatLoginByCode, verifySmsCode } from '@/features/auth/api'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { registerFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useSmsVerification } from '@/features/auth/hooks/use-sms-verification'  // 新增
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [agreedToLegal, setAgreedToLegal] = useState(true)
  const [wechatCode, setWeChatCode] = useState('')
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')

  const { status } = useStatus()
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const { redirectToLogin, handleLoginSuccess } = useAuthRedirect()
  const {
    isSending: isSendingCode,
    secondsLeft,
    isActive,
    sendCode,
  } = useEmailVerification({
    turnstileToken,
    validateTurnstile,
  })

  // 新增短信验证 Hook
  const {
    isSending: isSendingSms,
    secondsLeft: smsSecondsLeft,
    isActive: isSmsActive,
    sendCode: sendSms,
  } = useSmsVerification({
    turnstileToken,
    validateTurnstile,
  })

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      phone: '',  // 新增
      verification_code: '',
      email: '',
      password: '',
      // confirmPassword: '',
    },
  })

  const emailValue = form.watch('email')
  const phoneValue = form.watch('phone')
  const emailVerificationRequired = !!status?.email_verification
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const oauthRegisterEnabled =
    status?.oauth_register_enabled ??
    status?.data?.oauth_register_enabled ??
    true
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)
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

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get('aff')?.trim()
    if (aff) {
      saveAffiliateCode(aff)
    }
  }, [])

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    // Validate email verification if required
    if (emailVerificationRequired) {
      if (!data.email) {
        toast.error(t('Please enter your email'))
        return
      }
      if (!verificationCode) {
        toast.error(t('Please enter the verification code'))
        return
      }
    }

    if (!validateTurnstile()) return

    setIsLoading(true)
    try {
      const res = await register({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        phone: data.phone || undefined,  // 新增
        verification_code: data.verification_code || undefined,
        aff_code: getAffiliateCode(),
        turnstile: turnstileToken,
      })

      if (res?.success) {
        toast.success(t('Account created! Please sign in'))
        try {
          redirectToLogin()
        } catch (navError) {
          console.error('Navigation failed, using fallback', navError)
          window.location.href = '/sign-in'
        }
      } else {
        toast.error(res?.message || t('Failed to create account'))
      }
    } catch (_error) {
      // Errors are handled by global interceptor
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendVerificationCode() {
    await sendCode(emailValue || '')
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
        await handleLoginSuccess(res.data as { id?: number } | null)
        toast.success(t('Signed in via WeChat'))
        handleWeChatDialogChange(false)
      } else {
        toast.error(res?.message || t('Login failed'))
      }
    } catch (_error) {
      toast.error(t('Login failed'))
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  return (
    <Form {...form}>
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('grid gap-5', className)}
      {...props}
    >
      {/* 用户名字段 - 带左侧 User 图标 */}
      <FormField
        control={form.control}
        name='username'
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className='relative'>
                <User className='text-muted-foreground absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2' />
                <Input
                  placeholder={t('Enter your username')}
                  className='pl-10'
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* 密码字段 - 带左侧 Lock 图标 + 右侧眼睛图标 */}
      <FormField
        control={form.control}
        name='password'
        render={({ field }) => {
          const [showPwd, setShowPwd] = useState(false)
          return (
            <FormItem>
              <FormControl>
                <div className='relative'>
                  <Lock className='text-muted-foreground absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 z-10' />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder={t('Shortest 8 characters')}
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
          )
        }}
      />

      {/* 手机号字段 - 带左侧 Phone 图标 */}
      <FormField
        control={form.control}
        name='phone'
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

      {/* 短信验证码字段*/}
      <FormField
        control={form.control}
        name='verification_code'
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className='relative'>
                <ShieldCheck className='text-muted-foreground absolute left-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2' />
                <Input
                  placeholder={t('Enter verification code')}
                  {...field}
                  className='pl-10 pr-[120px]'
                />
                <Button
                  variant='ghost'
                  type='button'
                  size='sm'
                  disabled={
                    isLoading ||
                    isSendingSms ||
                    isSmsActive ||
                    !phoneValue ||       // 判断手机号是否已填
                    !turnstileReady
                  }
                  onClick={async () => {
                    await sendSms(phoneValue || '')
                  }}
                  className='absolute right-3 top-0 bottom-0 my-auto flex items-center justify-center text-primary hover:text-primary disabled:cursor-not-allowed h-8'
                >
                  {isSmsActive
                    ? t('Resend ({{seconds}}s)', { seconds: smsSecondsLeft })
                    : isSendingSms
                      ? <Loader2 className='h-4 w-4 animate-spin' />
                      : t('Send SMS code')}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Turnstile */}
      {isTurnstileEnabled && (
        <div className='mt-2'>
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={setTurnstileToken}
          />
        </div>
      )}

      {/* 协议勾选 - 内联样式匹配图片 */}
      <label className='flex cursor-pointer items-start gap-2 text-sm'>
        <input
          type='checkbox'
          checked={agreedToLegal}
          onChange={(e) => setAgreedToLegal(e.target.checked)}
          className='border-primary text-primary mt-0.5 h-4 w-4 rounded'
        />
        <span className='text-muted-foreground'>
          {t('I have read and agree to the')}{' '}
          <a href='/user-agreement' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>
            {t('Service Terms')}
          </a>{' '}
          {t('and')}{' '}
          <a href='/privacy-policy' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>
            {t('Privacy Policy')}
          </a>
        </span>
      </label>

      {/* 注册按钮 - 蓝色主色调圆角 */}
      <Button
        type='submit'
        className='w-full border-0 bg-[#1677ff] py-6 text-base font-medium text-white shadow-lg shadow-blue-500/25 hover:bg-[#4096ff] disabled:bg-[#1677ff]/50 disabled:text-white/70'
        disabled={isLoading || !agreedToLegal || !turnstileReady}
      >
        {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
        {t('Sign up')}
      </Button>
    </form>
  </Form>



    // <Form {...form}>
    //   <form
    //     onSubmit={form.handleSubmit(onSubmit)}
    //     className={cn('grid gap-4', className)}
    //     {...props}
    //   >
    //     {/* Username Field */}
    //     <FormField
    //       control={form.control}
    //       name='username'
    //       render={({ field }) => (
    //         <FormItem>
    //           <FormLabel>{t('Username')}</FormLabel>
    //           <FormControl>
    //             <Input placeholder={t('Enter your username')} {...field} />
    //           </FormControl>
    //           <FormMessage />
    //         </FormItem>
    //       )}
    //     />

    //     {/* Password Field */}
    //     <FormField
    //       control={form.control}
    //       name='password'
    //       render={({ field }) => (
    //         <FormItem>
    //           <FormLabel>{t('Password')}</FormLabel>
    //           <FormControl>
    //             <PasswordInput
    //               placeholder={t('Enter password (8-20 characters)')}
    //               {...field}
    //             />
    //           </FormControl>
    //           <FormMessage />
    //         </FormItem>
    //       )}
    //     />

    //     {/* Confirm Password Field */}
    //     <FormField
    //       control={form.control}
    //       name='confirmPassword'
    //       render={({ field }) => (
    //         <FormItem>
    //           <FormLabel>{t('Confirm password')}</FormLabel>
    //           <FormControl>
    //             <PasswordInput placeholder={t('Confirm password')} {...field} />
    //           </FormControl>
    //           <FormMessage />
    //         </FormItem>
    //       )}
    //     />

    //     {/* Email Verification Section */}
    //     {emailVerificationRequired && (
    //       <>
    //         {/* Email Field */}
    //         <FormField
    //           control={form.control}
    //           name='email'
    //           render={({ field }) => (
    //             <FormItem>
    //               <FormLabel>
    //                 {t('Email (required for verification)')}
    //               </FormLabel>
    //               <FormControl>
    //                 <Input
    //                   placeholder={t('name@example.com')}
    //                   type='email'
    //                   {...field}
    //                 />
    //               </FormControl>
    //               <FormMessage />
    //             </FormItem>
    //           )}
    //         />

    //         {/* Verification Code Field */}
    //         <div className='flex items-end gap-2'>
    //           <div className='flex-1'>
    //             <Input
    //               placeholder={t('Verification code')}
    //               value={verificationCode}
    //               onChange={(e) => setVerificationCode(e.target.value)}
    //             />
    //           </div>
    //           <Button
    //             variant='outline'
    //             type='button'
    //             disabled={
    //               isLoading ||
    //               isSendingCode ||
    //               isActive ||
    //               !emailValue ||
    //               !turnstileReady
    //             }
    //             onClick={handleSendVerificationCode}
    //           >
    //             {isActive ? (
    //               t('Resend ({{seconds}}s)', { seconds: secondsLeft })
    //             ) : isSendingCode ? (
    //               <Loader2 className='h-4 w-4 animate-spin' />
    //             ) : (
    //               t('Send code')
    //             )}
    //           </Button>
    //         </div>
    //       </>
    //     )}

    //     {/* SMS Verification Section */}
    //     <div className='mt-0 space-y-4'>
    //       {/* Phone Number Field */}
    //       <FormField
    //         control={form.control}
    //         name='phone_number'
    //         render={({ field }) => (
    //           <FormItem>
    //             <FormLabel>{t('Phone number')}</FormLabel>
    //             <FormControl>
    //               <Input 
    //                 placeholder={t('Enter your phone number')} 
    //                 type='tel'
    //                 {...field} 
    //               />
    //             </FormControl>
    //             <FormMessage />
    //           </FormItem>
    //         )}
    //       />

    //       {/* SMS Verification Code Field */}
    //       <div className='flex items-end gap-2'>
    //         <div className='flex-1'>
    //           <Input
    //             placeholder={t('SMS verification code')}
    //             value={smsVerificationCode}
    //             onChange={(e) => setSmsVerificationCode(e.target.value)}
    //           />
    //         </div>
    //         <Button
    //           variant='outline'
    //           type='button'
    //           disabled={
    //             isLoading ||
    //             isSendingSms ||
    //             isSmsActive ||
    //             !form.watch('phone_number') ||
    //             !turnstileReady
    //           }
    //           onClick={async () => {
    //             await sendSms(form.watch('phone_number') || '')
    //           }}
    //         >
    //           {isSmsActive ? (
    //             t('Resend ({{seconds}}s)', { seconds: smsSecondsLeft })
    //           ) : isSendingSms ? (
    //             <Loader2 className='h-4 w-4 animate-spin' />
    //           ) : (
    //             t('Send SMS code')
    //           )}
    //         </Button>
    //       </div>
    //     </div>

    //     {/* Turnstile */}
    //     {isTurnstileEnabled && (
    //       <div className='mt-2'>
    //         <Turnstile
    //           siteKey={turnstileSiteKey}
    //           onVerify={setTurnstileToken}
    //         />
    //       </div>
    //     )}

    //     <LegalConsent
    //       status={status}
    //       checked={agreedToLegal}
    //       onCheckedChange={setAgreedToLegal}
    //       className='mt-1'
    //     />

    //     {/* Submit Button */}
    //     <Button
    //       type='submit'
    //       className='mt-2 w-full justify-center gap-2'
    //       disabled={
    //         isLoading ||
    //         (requiresLegalConsent && !agreedToLegal) ||
    //         !turnstileReady
    //       }
    //     >
    //       {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
    //       {t('Create account')}
    //     </Button>

    //     {oauthRegisterEnabled && (
    //       <OAuthProviders
    //         status={status}
    //         disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
    //         onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
    //         isWeChatLoading={isWeChatSubmitting}
    //         className='pt-2'
    //       />
    //     )}
    //   </form>

    //   {hasWeChatLogin && (
    //     <Dialog
    //       open={isWeChatDialogOpen}
    //       onOpenChange={handleWeChatDialogChange}
    //       title={t('WeChat sign in')}
    //       description={t(
    //         'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
    //       )}
    //       contentClassName='max-w-sm'
    //       headerClassName='text-left'
    //       contentHeight='auto'
    //       bodyClassName='space-y-4'
    //       footer={
    //         <>
    //           <Button
    //             type='button'
    //             variant='outline'
    //             onClick={() => handleWeChatDialogChange(false)}
    //             disabled={isWeChatSubmitting}
    //           >
    //             {t('Cancel')}
    //           </Button>
    //           <Button
    //             type='button'
    //             onClick={handleWeChatLogin}
    //             disabled={
    //               isWeChatSubmitting ||
    //               !wechatCode.trim() ||
    //               (requiresLegalConsent && !agreedToLegal)
    //             }
    //             className='gap-2'
    //           >
    //             {isWeChatSubmitting ? (
    //               <Loader2 className='h-4 w-4 animate-spin' />
    //             ) : null}
    //             {t('Confirm')}
    //           </Button>
    //         </>
    //       }
    //     >
    //       {wechatQrCodeUrl ? (
    //         <div className='flex justify-center'>
    //           <img
    //             src={wechatQrCodeUrl}
    //             alt={t('WeChat login QR code')}
    //             className='h-40 w-40 rounded-md border object-contain'
    //           />
    //         </div>
    //       ) : (
    //         <p className='text-muted-foreground text-sm'>
    //           {t('QR code is not configured. Please contact support.')}
    //         </p>
    //       )}
    //       <div className='grid gap-2'>
    //         <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
    //         <Input
    //           id='wechat-code'
    //           placeholder={t('Enter the verification code')}
    //           value={wechatCode}
    //           onChange={(event) => setWeChatCode(event.target.value)}
    //           autoComplete='one-time-code'
    //         />
    //       </div>
    //     </Dialog>
    //   )}
    // </Form>
  )
}
