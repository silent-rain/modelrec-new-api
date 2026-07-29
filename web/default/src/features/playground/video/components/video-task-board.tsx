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
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  Film,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

import type { VideoTask, VideoTaskFilter } from '../types'

type TaskCounts = Record<VideoTaskFilter, number>

type VideoTaskBoardProps = {
  filter: VideoTaskFilter
  tasks: VideoTask[]
  taskCounts: TaskCounts
  onFilterChange: (filter: VideoTaskFilter) => void
  onRetry: (task: VideoTask) => void
  onReuse: (task: VideoTask) => void
}

const FILTERS: VideoTaskFilter[] = ['all', 'active', 'completed', 'failed']

export function VideoTaskBoard({
  filter,
  tasks,
  taskCounts,
  onFilterChange,
  onRetry,
  onReuse,
}: VideoTaskBoardProps) {
  const { t } = useTranslation()

  const filterLabel = (value: VideoTaskFilter) => {
    if (value === 'active') return t('Active')
    if (value === 'completed') return t('Completed')
    if (value === 'failed') return t('Failed')
    return t('All')
  }

  return (
    <div className='mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5 lg:p-6'>
      <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-end'>
        <div>
          <div className='flex items-center gap-2'>
            <h2 className='text-base font-semibold'>{t('Generation tasks')}</h2>
            {taskCounts.active > 0 && (
              <Badge variant='secondary' className='gap-1'>
                <LoaderCircle className='animate-spin' />
                {t('{{count}} running', { count: taskCounts.active })}
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t(
              'Async tasks continue running while you prepare the next video.'
            )}
          </p>
        </div>
        <div className='bg-muted flex w-fit items-center rounded-lg p-1'>
          {FILTERS.map((item) => (
            <button
              key={item}
              type='button'
              onClick={() => onFilterChange(item)}
              className={cn(
                'text-muted-foreground h-7 rounded-md px-2 text-xs font-medium transition-colors',
                filter === item && 'bg-background text-foreground shadow-xs'
              )}
            >
              {filterLabel(item)}
              <span className='ml-1 tabular-nums opacity-60'>
                {taskCounts[item]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className='border-border bg-card grid min-h-64 place-items-center rounded-xl border border-dashed p-8 text-center'>
          <div>
            <div className='bg-muted mx-auto grid size-11 place-items-center rounded-xl'>
              <Film className='text-muted-foreground size-5' />
            </div>
            <p className='mt-3 text-sm font-medium'>
              {t('No tasks in this view')}
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t('Create a video or choose another filter.')}
            </p>
          </div>
        </div>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {tasks.map((task) => (
            <VideoTaskCard
              key={task.id}
              task={task}
              onRetry={() => onRetry(task)}
              onReuse={() => onReuse(task)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type VideoTaskCardProps = {
  task: VideoTask
  onRetry: () => void
  onReuse: () => void
}

function VideoTaskCard({ task, onRetry, onReuse }: VideoTaskCardProps) {
  const { t } = useTranslation()
  const [previewOpen, setPreviewOpen] = useState(false)
  const active = task.status === 'queued' || task.status === 'processing'

  const copyTaskId = async () => {
    try {
      await navigator.clipboard.writeText(task.id)
      toast.success(t('Task ID copied'))
    } catch {
      toast.error(t('Failed to copy task ID'))
    }
  }

  return (
    <article className='bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1'>
      <div className='relative aspect-video overflow-hidden bg-slate-950'>
        <img
          src={task.request.inputImage.url}
          alt={t('Video source image')}
          className={cn(
            'size-full object-cover transition duration-700',
            active && 'scale-105 opacity-55 blur-[1px]',
            task.status === 'failed' && 'opacity-35 grayscale'
          )}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10' />

        {task.status === 'succeeded' && (
          <div className='absolute inset-0 grid place-items-center'>
            <button
              type='button'
              aria-label={t('Preview generated video')}
              onClick={() => setPreviewOpen(true)}
              className='grid size-12 place-items-center rounded-full bg-white/90 text-black shadow-xl transition-transform hover:scale-105'
            >
              <Play className='ml-0.5 size-5 fill-current' />
            </button>
          </div>
        )}

        {active && (
          <div className='absolute inset-0 grid place-items-center'>
            <div className='rounded-lg bg-black/50 px-3 py-2 text-center text-white backdrop-blur'>
              <LoaderCircle className='mx-auto size-5 animate-spin' />
              <p className='mt-1 text-[11px]'>
                {task.status === 'queued'
                  ? t('Waiting in queue')
                  : t('Rendering frames')}
              </p>
            </div>
          </div>
        )}

        <div className='absolute inset-x-3 top-3 flex items-start justify-between gap-2'>
          <StatusBadge status={task.status} />
          <Badge className='border-white/15 bg-black/45 text-white backdrop-blur'>
            {t('{{resolution}} · {{count}}s', {
              resolution: task.request.resolution,
              count: task.request.duration,
            })}
          </Badge>
        </div>

        <p className='absolute inset-x-3 bottom-3 line-clamp-2 text-xs leading-relaxed text-white/90'>
          {task.request.prompt}
        </p>
      </div>

      <div className='space-y-3 p-3.5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='truncate text-xs font-semibold'>{task.modelLabel}</p>
            <button
              type='button'
              onClick={copyTaskId}
              className='text-muted-foreground hover:text-foreground mt-1 flex max-w-full items-center gap-1 font-mono text-[10px]'
            >
              <span className='truncate'>{task.id}</span>
              <Copy className='size-2.5 shrink-0' />
            </button>
          </div>
          <div className='text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]'>
            <Clock3 className='size-3' />
            {new Date(task.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {active && (
          <div className='space-y-1.5'>
            <div className='text-muted-foreground flex justify-between text-[10px]'>
              <span>{t('Generation progress')}</span>
              <span className='tabular-nums'>{task.progress}%</span>
            </div>
            <Progress value={task.progress} />
          </div>
        )}

        {task.status === 'failed' && (
          <div className='bg-destructive/8 text-destructive flex gap-2 rounded-lg px-2.5 py-2 text-[11px]'>
            <AlertCircle className='mt-0.5 size-3.5 shrink-0' />
            <span>
              {task.errorCode === 'source_image_rejected'
                ? t('The provider rejected the source image.')
                : t('The provider could not complete this generation.')}
            </span>
          </div>
        )}

        <div className='flex items-center justify-end gap-1 border-t pt-2.5'>
          <Button type='button' size='xs' variant='ghost' onClick={onReuse}>
            <Clipboard />
            {t('Reuse settings')}
          </Button>
          {task.status === 'failed' && (
            <Button type='button' size='xs' variant='outline' onClick={onRetry}>
              <RotateCcw />
              {t('Retry')}
            </Button>
          )}
          {task.status === 'succeeded' && (
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={() => setPreviewOpen(true)}
            >
              <RefreshCw />
              {t('Open result')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='gap-3 p-3 sm:max-w-3xl'>
          <DialogHeader className='px-1 pt-1'>
            <DialogTitle>{t('Generated video preview')}</DialogTitle>
            <DialogDescription>
              {t(
                'This interactive placeholder will use the real video URL after backend integration.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='relative aspect-video overflow-hidden rounded-lg bg-black'>
            <img
              src={task.request.inputImage.url}
              alt={t('Generated video preview')}
              className='size-full scale-105 object-cover'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10' />
            <div className='absolute inset-0 grid place-items-center'>
              <div className='grid size-14 place-items-center rounded-full bg-white/90 text-black shadow-xl'>
                <Play className='ml-1 size-6 fill-current' />
              </div>
            </div>
            <div className='absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-white'>
              <p className='line-clamp-2 max-w-xl text-xs leading-relaxed'>
                {task.request.prompt}
              </p>
              <Badge className='shrink-0 border-white/15 bg-black/45 text-white backdrop-blur'>
                {t('{{resolution}} · {{count}}s', {
                  resolution: task.request.resolution,
                  count: task.request.duration,
                })}
              </Badge>
            </div>
          </div>
          <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-1 text-[11px]'>
            <span>{task.modelLabel}</span>
            <span>{task.id}</span>
            <span>{t('Mock result · no video file yet')}</span>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function StatusBadge({ status }: { status: VideoTask['status'] }) {
  const { t } = useTranslation()
  if (status === 'succeeded') {
    return (
      <Badge className='bg-emerald-500/90 text-white'>
        <CheckCircle2 />
        {t('Completed')}
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant='destructive' className='bg-destructive/90 text-white'>
        <AlertCircle />
        {t('Failed')}
      </Badge>
    )
  }
  return (
    <Badge className='bg-sky-500/90 text-white'>
      {status === 'queued' ? (
        <Clock3 />
      ) : (
        <LoaderCircle className='animate-spin' />
      )}
      {status === 'queued' ? t('Queued') : t('Processing')}
    </Badge>
  )
}
