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
import {
  ImagePlus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  IMAGE_VALIDATION_MESSAGES,
  validateImageFile,
} from '../image-validation'
import { SAMPLE_SOURCE_IMAGE } from '../mock-adapter'
import type { VideoModelProfile, VideoSourceImage } from '../types'

type SourceImageFieldProps = {
  profile: VideoModelProfile
  value: VideoSourceImage | null
  onChange: (image: VideoSourceImage | null) => void
}

export function SourceImageField({
  profile,
  value,
  onChange,
}: SourceImageFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = async (file?: File) => {
    if (!file) return
    setError(null)
    const result = await validateImageFile(file, profile)
    if (!result.ok) {
      setError(
        t(IMAGE_VALIDATION_MESSAGES[result.error], {
          size: profile.maxImageSizeMb,
          edge: profile.minImageEdge,
        })
      )
      return
    }
    onChange(result.image)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    void processFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void processFile(event.dataTransfer.files[0])
  }

  if (value) {
    return (
      <div className='space-y-2'>
        <div className='group relative aspect-video overflow-hidden rounded-xl border bg-black'>
          <img
            src={value.url}
            alt={t('Source image preview')}
            className='size-full object-cover'
          />
          <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 pt-10 text-white'>
            <div className='min-w-0'>
              <p className='truncate text-xs font-medium'>{value.name}</p>
              <p className='text-[10px] text-white/70'>
                {value.width} × {value.height}
              </p>
            </div>
            <div className='flex shrink-0 gap-1'>
              <Button
                type='button'
                size='icon-sm'
                variant='secondary'
                aria-label={t('Replace image')}
                onClick={() => inputRef.current?.click()}
                className='bg-white/90 text-black hover:bg-white'
              >
                <RefreshCw />
              </Button>
              <Button
                type='button'
                size='icon-sm'
                variant='secondary'
                aria-label={t('Remove image')}
                onClick={() => onChange(null)}
                className='bg-white/90 text-black hover:bg-white'
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/png,image/bmp,image/webp'
          className='hidden'
          onChange={handleInput}
        />
        {error && (
          <p role='alert' className='text-destructive text-xs'>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-border bg-muted/20 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-colors',
          isDragging && 'border-primary bg-primary/5'
        )}
      >
        <div className='bg-background ring-border mb-3 grid size-10 place-items-center rounded-xl shadow-sm ring-1'>
          {isDragging ? (
            <ImagePlus className='text-primary size-5' />
          ) : (
            <UploadCloud className='text-muted-foreground size-5' />
          )}
        </div>
        <p className='text-sm font-medium'>
          {isDragging ? t('Drop image here') : t('Add a source image')}
        </p>
        <p className='text-muted-foreground mt-1 max-w-64 text-xs leading-relaxed'>
          {t(
            'JPG, PNG, BMP, or WebP · up to {{size}} MB · shortest edge ≥ {{edge}} px',
            { size: profile.maxImageSizeMb, edge: profile.minImageEdge }
          )}
        </p>
        <div className='mt-4 flex flex-wrap justify-center gap-2'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud />
            {t('Choose image')}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={() => {
              setError(null)
              onChange(SAMPLE_SOURCE_IMAGE)
            }}
          >
            <Sparkles />
            {t('Use example')}
          </Button>
        </div>
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/png,image/bmp,image/webp'
          className='hidden'
          onChange={handleInput}
        />
      </div>
      {error && (
        <p role='alert' className='text-destructive text-xs'>
          {error}
        </p>
      )}
    </div>
  )
}
