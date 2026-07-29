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
import { ChevronRight, Clapperboard, Dice5, Info, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import type {
  VideoEstimate,
  VideoGenerationDraft,
  VideoModelProfile,
  VideoSourceImage,
} from '../types'
import { SourceImageField } from './source-image-field'

type VideoGenerationFormProps = {
  draft: VideoGenerationDraft
  estimate: VideoEstimate | null
  isSubmitting: boolean
  profiles: VideoModelProfile[]
  selectedProfile: VideoModelProfile
  onModelChange: (model: string | null) => void
  onSourceChange: (image: VideoSourceImage | null) => void
  onRandomizeSeed: () => void
  onUpdate: <K extends keyof VideoGenerationDraft>(
    key: K,
    value: VideoGenerationDraft[K]
  ) => void
  onSubmit: () => void
}

const GROUPS = [
  { value: 'default', label: 'Default group' },
  { value: 'auto', label: 'Auto routing' },
]

export function VideoGenerationForm({
  draft,
  estimate,
  isSubmitting,
  profiles,
  selectedProfile,
  onModelChange,
  onSourceChange,
  onRandomizeSeed,
  onUpdate,
  onSubmit,
}: VideoGenerationFormProps) {
  const { t } = useTranslation()
  const canSubmit = Boolean(draft.inputImage && draft.prompt.trim())
  const groupItems = GROUPS.map((group) => ({
    ...group,
    label: t(group.label),
  }))

  return (
    <div className='min-h-full space-y-5 p-4 sm:p-5'>
      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold'>{t('Image to video')}</p>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {t('Animate a still image with a natural-language direction.')}
            </p>
          </div>
          <Badge variant='outline' className='shrink-0'>
            {t('Mock mode')}
          </Badge>
        </div>

        <div className='grid grid-cols-[minmax(0,1fr)_minmax(112px,0.44fr)] gap-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='video-model'>{t('Model')}</Label>
            <Select
              items={profiles.map((profile) => ({
                value: profile.id,
                label: profile.label,
              }))}
              value={draft.model}
              onValueChange={onModelChange}
            >
              <SelectTrigger id='video-model' className='w-full min-w-0'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <span className='flex min-w-0 flex-col py-0.5'>
                        <span className='truncate font-medium'>
                          {profile.label}
                        </span>
                        <span className='text-muted-foreground text-[11px]'>
                          {profile.vendor}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='video-group'>{t('Group')}</Label>
            <Select
              items={groupItems}
              value={draft.group}
              onValueChange={(value) => value && onUpdate('group', value)}
            >
              <SelectTrigger id='video-group' className='w-full min-w-0'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {groupItems.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='bg-muted/40 rounded-lg border px-3 py-2.5'>
          <p className='text-xs font-medium'>{selectedProfile.label}</p>
          <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
            {t(selectedProfile.description)}
          </p>
        </div>
      </section>

      <Separator />

      <section className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label>{t('Source image')}</Label>
          <span className='text-muted-foreground text-[11px]'>
            {t('Required')}
          </span>
        </div>
        <SourceImageField
          profile={selectedProfile}
          value={draft.inputImage}
          onChange={onSourceChange}
        />
      </section>

      <section className='space-y-2'>
        <div className='flex items-center justify-between gap-3'>
          <Label htmlFor='video-prompt'>{t('Motion prompt')}</Label>
          <span className='text-muted-foreground text-[11px] tabular-nums'>
            {draft.prompt.length}/800
          </span>
        </div>
        <Textarea
          id='video-prompt'
          value={draft.prompt}
          maxLength={800}
          rows={4}
          placeholder={t(
            'Describe camera movement, subject motion, atmosphere, and pacing...'
          )}
          onChange={(event) => onUpdate('prompt', event.target.value)}
          className='min-h-28 resize-none'
        />
        <p className='text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed'>
          <Info className='mt-0.5 size-3 shrink-0' />
          {t(
            'Describe motion instead of repeating what is already in the image.'
          )}
        </p>
      </section>

      <section className='space-y-4'>
        <OptionButtons
          label={t('Resolution')}
          value={draft.resolution}
          options={selectedProfile.resolutions}
          onChange={(value) => onUpdate('resolution', value)}
        />
        <OptionButtons
          label={t('Duration')}
          value={String(draft.duration)}
          options={selectedProfile.durations.map(String)}
          renderLabel={(value) =>
            t('{{count}} seconds', { count: Number(value) })
          }
          onChange={(value) => onUpdate('duration', Number(value))}
        />
      </section>

      {(selectedProfile.supportsSeed ||
        selectedProfile.advancedOptions.promptExtend ||
        selectedProfile.advancedOptions.watermark) && (
        <section className='space-y-4 rounded-xl border p-3'>
          <div className='flex items-center gap-2'>
            <Sparkles className='text-muted-foreground size-3.5' />
            <p className='text-xs font-semibold'>{t('Advanced settings')}</p>
          </div>

          {selectedProfile.supportsSeed && (
            <div className='space-y-1.5'>
              <Label htmlFor='video-seed' className='text-xs'>
                {t('Random seed')}
              </Label>
              <div className='flex gap-2'>
                <Input
                  id='video-seed'
                  type='number'
                  min={0}
                  max={2_147_483_647}
                  value={draft.seed ?? ''}
                  onChange={(event) =>
                    onUpdate(
                      'seed',
                      event.target.value === ''
                        ? undefined
                        : Number(event.target.value)
                    )
                  }
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('Generate random seed')}
                  onClick={onRandomizeSeed}
                >
                  <Dice5 />
                </Button>
              </div>
            </div>
          )}

          {selectedProfile.advancedOptions.promptExtend && (
            <SwitchRow
              label={t('Prompt enhancement')}
              description={t('Let the model enrich motion and camera details.')}
              checked={Boolean(draft.options.promptExtend)}
              onCheckedChange={(checked) =>
                onUpdate('options', {
                  ...draft.options,
                  promptExtend: checked,
                })
              }
            />
          )}

          {selectedProfile.advancedOptions.watermark && (
            <SwitchRow
              label={t('Add watermark')}
              description={t('Mark the result as AI-generated content.')}
              checked={Boolean(draft.options.watermark)}
              onCheckedChange={(checked) =>
                onUpdate('options', { ...draft.options, watermark: checked })
              }
            />
          )}
        </section>
      )}

      <div className='bg-background/95 sticky bottom-0 z-10 -mx-4 -mb-4 border-t p-4 backdrop-blur sm:-mx-5 sm:-mb-5 sm:p-5'>
        <Button
          size='lg'
          className='h-10 w-full justify-between px-3'
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
        >
          <span className='flex items-center gap-2'>
            <Clapperboard />
            {isSubmitting ? t('Submitting...') : t('Generate video')}
          </span>
          <span className='flex items-center gap-1 text-xs font-normal opacity-80'>
            {estimate
              ? t('Est. ¥{{amount}}', { amount: estimate.amount.toFixed(2) })
              : t('Add image and prompt')}
            <ChevronRight />
          </span>
        </Button>
        <p className='text-muted-foreground mt-2 text-center text-[10px]'>
          {t(
            'The estimate is for reference; actual billing follows the provider.'
          )}
        </p>
      </div>
    </div>
  )
}

type OptionButtonsProps = {
  label: string
  value: string
  options: string[]
  renderLabel?: (value: string) => string
  onChange: (value: string) => void
}

function OptionButtons({
  label,
  value,
  options,
  renderLabel = (option) => option,
  onChange,
}: OptionButtonsProps) {
  return (
    <div className='space-y-2'>
      <Label className='text-xs'>{label}</Label>
      <div className='grid grid-cols-2 gap-2'>
        {options.map((option) => (
          <button
            type='button'
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              'border-border bg-background h-8 rounded-lg border text-xs font-medium transition-colors',
              option === value
                ? 'border-primary bg-primary/5 text-primary ring-primary/15 ring-2'
                : 'hover:bg-muted'
            )}
          >
            {renderLabel(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

type SwitchRowProps = {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: SwitchRowProps) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div>
        <p className='text-xs font-medium'>{label}</p>
        <p className='text-muted-foreground mt-0.5 text-[11px]'>
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
