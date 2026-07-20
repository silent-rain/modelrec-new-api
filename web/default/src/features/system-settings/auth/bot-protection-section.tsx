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
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const HUMAN_VERIFICATION_PROVIDERS = ['none', 'turnstile', 'aliyun'] as const
const ALIYUN_CAPTCHA_REGIONS = ['cn', 'sgp'] as const

const createBotProtectionSchema = (t: (key: string) => string) =>
  z
    .object({
      HumanVerificationProvider: z.enum(HUMAN_VERIFICATION_PROVIDERS),
      TurnstileCheckEnabled: z.boolean(),
      TurnstileSiteKey: z.string(),
      TurnstileSecretKey: z.string(),
      TurnstileSecretKeyConfigured: z.boolean(),
      AliyunCaptchaRegion: z.enum(ALIYUN_CAPTCHA_REGIONS),
      AliyunCaptchaPrefix: z.string(),
      AliyunCaptchaSceneID: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.HumanVerificationProvider === 'turnstile') {
        if (!values.TurnstileSiteKey.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['TurnstileSiteKey'],
            message: t('Site Key is required'),
          })
        }
        if (
          !values.TurnstileSecretKeyConfigured &&
          !values.TurnstileSecretKey.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['TurnstileSecretKey'],
            message: t('Secret Key is required'),
          })
        }
      }

      if (values.HumanVerificationProvider === 'aliyun') {
        if (!values.AliyunCaptchaPrefix.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['AliyunCaptchaPrefix'],
            message: t('Captcha Prefix is required'),
          })
        }
        if (!values.AliyunCaptchaSceneID.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['AliyunCaptchaSceneID'],
            message: t('Captcha SceneId is required'),
          })
        }
      }
    })

type BotProtectionFormValues = z.infer<
  ReturnType<typeof createBotProtectionSchema>
>

type BotProtectionSectionProps = {
  defaultValues: BotProtectionFormValues
}

const TURNSTILE_OPTION_KEYS = [
  'TurnstileSiteKey',
  'TurnstileSecretKey',
] as const

const ALIYUN_OPTION_KEYS = [
  'AliyunCaptchaRegion',
  'AliyunCaptchaPrefix',
  'AliyunCaptchaSceneID',
] as const

export function BotProtectionSection(props: BotProtectionSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const schema = useMemo(() => createBotProtectionSchema(t), [t])

  const form = useForm<BotProtectionFormValues>({
    resolver: zodResolver(schema) as Resolver<BotProtectionFormValues>,
    defaultValues: props.defaultValues,
  })

  useEffect(() => {
    form.reset(props.defaultValues)
  }, [form, props.defaultValues])

  const selectedProvider = useWatch({
    control: form.control,
    name: 'HumanVerificationProvider',
  })

  const onSubmit = async (data: BotProtectionFormValues) => {
    const configKeys =
      data.HumanVerificationProvider === 'turnstile'
        ? TURNSTILE_OPTION_KEYS
        : ALIYUN_OPTION_KEYS

    if (data.HumanVerificationProvider !== 'none') {
      for (const key of configKeys) {
        const value = data[key].trim()
        if (key === 'TurnstileSecretKey' && value === '') continue

        const result = await updateOption.mutateAsync({
          key,
          value,
          suppressSuccessToast: true,
        })
        if (!result.success) return
      }
    }

    const turnstileEnabled = data.HumanVerificationProvider === 'turnstile'
    const turnstileResult = await updateOption.mutateAsync({
      key: 'TurnstileCheckEnabled',
      value: turnstileEnabled,
      suppressSuccessToast: true,
    })
    if (!turnstileResult.success) return

    await updateOption.mutateAsync({
      key: 'HumanVerificationProvider',
      value: data.HumanVerificationProvider,
    })
  }

  return (
    <SettingsSection title={t('Bot Protection')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />

          <FormField
            control={form.control}
            name='HumanVerificationProvider'
            render={({ field }) => (
              <FormItem data-settings-form-span='full'>
                <FormLabel>{t('Human verification provider')}</FormLabel>
                <Select
                  items={[
                    { value: 'none', label: t('Disabled') },
                    { value: 'turnstile', label: 'Cloudflare Turnstile' },
                    { value: 'aliyun', label: t('Aliyun Captcha') },
                  ]}
                  value={field.value}
                  onValueChange={(value) => {
                    if (!value) return
                    field.onChange(value)
                    form.setValue(
                      'TurnstileCheckEnabled',
                      value === 'turnstile',
                      { shouldDirty: true }
                    )
                  }}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      <SelectItem value='none'>{t('Disabled')}</SelectItem>
                      <SelectItem value='turnstile'>
                        Cloudflare Turnstile
                      </SelectItem>
                      <SelectItem value='aliyun'>
                        {t('Aliyun Captcha')}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t(
                    'Only one provider is active at a time. Changes take effect immediately after saving.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedProvider === 'turnstile' ? (
            <>
              <FormField
                control={form.control}
                name='TurnstileSiteKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Site Key')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Your Turnstile site key')}
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='TurnstileSecretKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Secret Key')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={
                          props.defaultValues.TurnstileSecretKeyConfigured
                            ? t('Configured; leave blank to keep unchanged')
                            : t('Your Turnstile secret key')
                        }
                        autoComplete='new-password'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'The secret key is stored server-side and is never returned.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}

          {selectedProvider === 'aliyun' ? (
            <>
              <FormField
                control={form.control}
                name='AliyunCaptchaRegion'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Service region')}</FormLabel>
                    <Select
                      items={[
                        { value: 'cn', label: t('China') },
                        { value: 'sgp', label: t('Singapore') },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value='cn'>{t('China')}</SelectItem>
                          <SelectItem value='sgp'>{t('Singapore')}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='AliyunCaptchaPrefix'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Captcha Prefix')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Your Aliyun Captcha Prefix')}
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='AliyunCaptchaSceneID'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Captcha SceneId')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Your Aliyun Captcha SceneId')}
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Aliyun AccessKey credentials remain in model-hub-rs and are not stored here.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
