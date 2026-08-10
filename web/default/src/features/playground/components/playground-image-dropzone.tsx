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
import { ImageIcon, PaperclipIcon, UploadIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { usePromptInputAttachments } from '@/components/ai-elements/prompt-input'

interface PlaygroundImageDropzoneProps {
  disabled?: boolean
  maxFiles: number
  maxFileSizeMb: number
}

function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

export function PlaygroundImageDropzone(props: PlaygroundImageDropzoneProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const dragDepthRef = useRef(0)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)

  useEffect(() => {
    const resetDragState = () => {
      dragDepthRef.current = 0
      setIsDraggingFiles(false)
    }

    const handleDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      if (props.disabled) return

      dragDepthRef.current += 1
      setIsDraggingFiles(true)
    }

    const handleDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = props.disabled ? 'none' : 'copy'
      }
    }

    const handleDragLeave = (event: DragEvent) => {
      if (dragDepthRef.current === 0 || props.disabled) return
      event.preventDefault()

      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) {
        setIsDraggingFiles(false)
      }
    }

    const handleDrop = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      event.stopPropagation()

      const files = event.dataTransfer?.files
      resetDragState()
      if (!props.disabled && files && files.length > 0) {
        attachments.add(files)
      }
    }

    window.addEventListener('dragenter', handleDragEnter, true)
    window.addEventListener('dragover', handleDragOver, true)
    window.addEventListener('dragleave', handleDragLeave, true)
    window.addEventListener('drop', handleDrop, true)
    window.addEventListener('dragend', resetDragState, true)
    window.addEventListener('blur', resetDragState)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter, true)
      window.removeEventListener('dragover', handleDragOver, true)
      window.removeEventListener('dragleave', handleDragLeave, true)
      window.removeEventListener('drop', handleDrop, true)
      window.removeEventListener('dragend', resetDragState, true)
      window.removeEventListener('blur', resetDragState)
      dragDepthRef.current = 0
    }
  }, [attachments, props.disabled])

  if (!isDraggingFiles || props.disabled) return null

  return createPortal(
    <div
      aria-live='polite'
      className='pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4'
      role='status'
    >
      <div className='bg-background/90 absolute inset-0 backdrop-blur-md' />
      <div className='border-primary/45 shadow-primary/5 relative flex size-full items-center justify-center rounded-3xl border-2 border-dashed shadow-[inset_0_0_80px_12px]'>
        <div className='motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 flex flex-col items-center px-6 text-center duration-200'>
          <div aria-hidden='true' className='relative mb-7 h-20 w-28'>
            <div className='absolute top-2 left-2 flex size-14 -rotate-12 items-center justify-center rounded-2xl bg-cyan-300 text-cyan-950 shadow-lg shadow-cyan-500/15'>
              <PaperclipIcon size={26} strokeWidth={1.8} />
            </div>
            <div className='absolute top-2 right-2 flex size-14 rotate-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20'>
              <ImageIcon size={27} strokeWidth={1.8} />
            </div>
            <div className='bg-primary text-primary-foreground ring-background absolute bottom-0 left-1/2 flex size-12 -translate-x-1/2 items-center justify-center rounded-2xl shadow-xl ring-4'>
              <UploadIcon size={24} strokeWidth={2} />
            </div>
          </div>

          <p className='text-foreground text-xl font-semibold tracking-tight'>
            {t('Drop images here to attach')}
          </p>
          <p className='text-muted-foreground mt-2 text-sm'>
            {t('Up to {{count}} images, {{size}} MB each', {
              count: props.maxFiles,
              size: props.maxFileSizeMb,
            })}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
