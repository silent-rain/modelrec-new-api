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
import { Clapperboard, ListVideo } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { VideoGenerationForm } from './components/video-generation-form'
import { VideoTaskBoard } from './components/video-task-board'
import { useVideoPlayground } from './use-video-playground'

type MobilePanel = 'create' | 'tasks'

export function VideoPlayground() {
  const { t } = useTranslation()
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('create')
  const playground = useVideoPlayground()

  if (playground.isLoading || !playground.selectedProfile) {
    return <VideoPlaygroundSkeleton />
  }

  const handleSubmit = async () => {
    const task = await playground.submit()
    if (!task) return
    toast.success(t('Video task submitted'))
    setMobilePanel('tasks')
  }

  return (
    <div className='bg-muted/15 flex size-full min-h-0 flex-col overflow-hidden'>
      <div className='bg-background flex h-11 shrink-0 items-center justify-between border-b px-3 lg:hidden'>
        <div className='bg-muted flex items-center rounded-lg p-1'>
          <MobilePanelButton
            active={mobilePanel === 'create'}
            label={t('Create')}
            icon={Clapperboard}
            onClick={() => setMobilePanel('create')}
          />
          <MobilePanelButton
            active={mobilePanel === 'tasks'}
            label={t('Tasks')}
            icon={ListVideo}
            count={playground.taskCounts.active}
            onClick={() => setMobilePanel('tasks')}
          />
        </div>
        <span className='text-muted-foreground text-[11px]'>
          {t('Image to video')}
        </span>
      </div>

      <div className='grid min-h-0 flex-1 lg:grid-cols-[390px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]'>
        <div
          className={cn(
            'bg-background min-h-0 overflow-y-auto overscroll-contain border-r [scrollbar-gutter:stable]',
            mobilePanel !== 'create' && 'hidden lg:block'
          )}
        >
          <VideoGenerationForm
            draft={playground.draft}
            estimate={playground.estimate}
            isSubmitting={playground.isSubmitting}
            profiles={playground.profiles}
            selectedProfile={playground.selectedProfile}
            onModelChange={playground.selectModel}
            onSourceChange={playground.setSourceImage}
            onRandomizeSeed={playground.randomizeSeed}
            onUpdate={playground.updateDraft}
            onSubmit={() => void handleSubmit()}
          />
        </div>

        <div
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
            mobilePanel !== 'tasks' && 'hidden lg:block'
          )}
        >
          <VideoTaskBoard
            filter={playground.filter}
            tasks={playground.filteredTasks}
            taskCounts={playground.taskCounts}
            onFilterChange={playground.setFilter}
            onRetry={(task) => {
              void playground
                .retryTask(task)
                .then(() => toast.success(t('Video task resubmitted')))
            }}
            onReuse={(task) => {
              playground.reuseTask(task)
              setMobilePanel('create')
              toast.success(t('Settings restored to the form'))
            }}
          />
        </div>
      </div>
    </div>
  )
}

type MobilePanelButtonProps = {
  active: boolean
  label: string
  icon: typeof Clapperboard
  count?: number
  onClick: () => void
}

function MobilePanelButton({
  active,
  label,
  icon: Icon,
  count = 0,
  onClick,
}: MobilePanelButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'text-muted-foreground flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium',
        active && 'bg-background text-foreground shadow-xs'
      )}
    >
      <Icon className='size-3.5' />
      {label}
      {count > 0 && (
        <span className='bg-primary text-primary-foreground grid size-4 place-items-center rounded-full text-[9px]'>
          {count}
        </span>
      )}
    </button>
  )
}

function VideoPlaygroundSkeleton() {
  return (
    <div className='grid size-full grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]'>
      <div className='space-y-5 border-r p-5'>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='aspect-video w-full rounded-xl' />
        <Skeleton className='h-28 w-full rounded-xl' />
        <Skeleton className='h-20 w-full rounded-xl' />
      </div>
      <div className='space-y-4 p-6'>
        <Skeleton className='h-8 w-56' />
        <div className='grid gap-4 xl:grid-cols-2'>
          <Skeleton className='aspect-video rounded-xl' />
          <Skeleton className='aspect-video rounded-xl' />
        </div>
      </div>
    </div>
  )
}
