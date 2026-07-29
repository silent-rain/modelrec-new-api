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
import { MessageSquareText, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { ChatPlayground } from './chat-playground'
import { VideoPlayground } from './video'

export type PlaygroundMode = 'chat' | 'video'

type PlaygroundProps = {
  mode?: PlaygroundMode
  onModeChange?: (mode: PlaygroundMode) => void
}

export function Playground({ mode = 'chat', onModeChange }: PlaygroundProps) {
  const { t } = useTranslation()

  return (
    <div className='flex size-full min-h-0 flex-col overflow-hidden'>
      <header className='bg-background/95 shrink-0 border-b backdrop-blur'>
        <div className='flex h-12 items-center justify-between px-4 sm:h-13 sm:px-5'>
          <div className='min-w-0'>
            <h1 className='truncate text-sm font-semibold sm:text-[15px]'>
              {t('Model Playground')}
            </h1>
            <p className='text-muted-foreground mt-0.5 hidden text-[11px] sm:block'>
              {t('Explore model capabilities before integration')}
            </p>
          </div>

          <p className='text-muted-foreground hidden text-[11px] lg:block'>
            {mode === 'chat'
              ? t('Test prompts and model responses in real time')
              : t('Create visual content and track asynchronous tasks')}
          </p>
        </div>

        <nav className='flex h-10 items-end px-1'>
          <div
            className='flex h-full items-end gap-1'
            role='tablist'
            aria-label={t('Playground mode')}
          >
            <ModeButton
              active={mode === 'chat'}
              controls='chat-playground-panel'
              icon={MessageSquareText}
              label={t('Text conversation')}
              onClick={() => onModeChange?.('chat')}
            />
            <ModeButton
              active={mode === 'video'}
              controls='video-playground-panel'
              icon={Sparkles}
              label={t('Visual generation')}
              onClick={() => onModeChange?.('video')}
            />
          </div>
        </nav>
      </header>

      <div className='relative min-h-0 flex-1'>
        <div
          id='chat-playground-panel'
          role='tabpanel'
          aria-labelledby='chat-playground-tab'
          aria-hidden={mode !== 'chat'}
          inert={mode !== 'chat'}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-150',
            mode === 'chat'
              ? 'visible z-10 opacity-100'
              : 'pointer-events-none invisible z-0 opacity-0'
          )}
        >
          <ChatPlayground />
        </div>
        <div
          id='video-playground-panel'
          role='tabpanel'
          aria-labelledby='video-playground-tab'
          aria-hidden={mode !== 'video'}
          inert={mode !== 'video'}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-150',
            mode === 'video'
              ? 'visible z-10 opacity-100'
              : 'pointer-events-none invisible z-0 opacity-0'
          )}
        >
          <VideoPlayground />
        </div>
      </div>
    </div>
  )
}

type ModeButtonProps = {
  active: boolean
  controls: string
  icon: typeof MessageSquareText
  label: string
  onClick: () => void
}

function ModeButton({
  active,
  controls,
  icon: Icon,
  label,
  onClick,
}: ModeButtonProps) {
  const id =
    controls === 'chat-playground-panel'
      ? 'chat-playground-tab'
      : 'video-playground-tab'

  return (
    <button
      id={id}
      type='button'
      role='tab'
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        'text-muted-foreground hover:text-foreground relative flex h-10 items-center gap-1.5 px-3 text-xs font-medium transition-colors sm:px-4 sm:text-[13px]',
        'after:bg-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:transition-transform after:duration-200 sm:after:inset-x-4',
        active && 'text-foreground after:scale-x-100'
      )}
    >
      <Icon className='size-3.5' />
      {label}
    </button>
  )
}
