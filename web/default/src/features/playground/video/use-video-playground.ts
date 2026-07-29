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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { videoPlaygroundApi } from './api'
import type {
  ImageToVideoRequest,
  VideoEstimate,
  VideoGenerationDraft,
  VideoModelProfile,
  VideoSourceImage,
  VideoTask,
  VideoTaskFilter,
} from './types'

const DEFAULT_DRAFT: VideoGenerationDraft = {
  model: '',
  group: 'default',
  prompt: '',
  inputImage: null,
  resolution: '',
  duration: 5,
  seed: 1234,
  options: { promptExtend: true, watermark: false },
}

function isActiveTask(task: VideoTask) {
  return task.status === 'queued' || task.status === 'processing'
}

export function filterVideoTasks(tasks: VideoTask[], filter: VideoTaskFilter) {
  if (filter === 'active') return tasks.filter(isActiveTask)
  if (filter === 'completed') {
    return tasks.filter((task) => task.status === 'succeeded')
  }
  if (filter === 'failed') {
    return tasks.filter((task) => task.status === 'failed')
  }
  return tasks
}

export function useVideoPlayground() {
  const [profiles, setProfiles] = useState<VideoModelProfile[]>([])
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [draft, setDraft] = useState<VideoGenerationDraft>(DEFAULT_DRAFT)
  const [filter, setFilter] = useState<VideoTaskFilter>('all')
  const [estimate, setEstimate] = useState<VideoEstimate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    let disposed = false
    const trackedObjectUrls = objectUrls.current

    void Promise.all([
      videoPlaygroundApi.listVideoModels(),
      videoPlaygroundApi.listVideoTasks(),
    ])
      .then(([modelProfiles, initialTasks]) => {
        if (disposed) return

        const firstProfile = modelProfiles[0]
        setProfiles(modelProfiles)
        setTasks(initialTasks)
        if (firstProfile) {
          setDraft((current) => ({
            ...current,
            model: firstProfile.id,
            resolution: firstProfile.resolutions[0],
            duration: firstProfile.durations[0],
          }))
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!disposed) setIsLoading(false)
      })

    return () => {
      disposed = true
      trackedObjectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTasks((current) =>
        current.map((task) => {
          if (task.status === 'queued') {
            return {
              ...task,
              status: 'processing',
              progress: 8,
              updatedAt: new Date().toISOString(),
            }
          }
          if (task.status !== 'processing') return task

          const nextProgress = Math.min(
            100,
            task.progress + 10 + Math.round(Math.random() * 10)
          )
          return {
            ...task,
            status: nextProgress >= 100 ? 'succeeded' : 'processing',
            progress: nextProgress,
            updatedAt: new Date().toISOString(),
          }
        })
      )
    }, 900)

    return () => window.clearInterval(interval)
  }, [])

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === draft.model) ?? null,
    [draft.model, profiles]
  )

  const request = useMemo<ImageToVideoRequest | null>(() => {
    if (!draft.inputImage || !draft.model) return null
    return {
      ...draft,
      taskType: 'image-to-video',
      inputImage: draft.inputImage,
    }
  }, [draft])

  useEffect(() => {
    let disposed = false
    if (!request) {
      setEstimate(null)
      return
    }

    void videoPlaygroundApi
      .estimateVideo(request)
      .then((result) => {
        if (!disposed) setEstimate(result)
      })
      .catch(() => {
        if (!disposed) setEstimate(null)
      })
    return () => {
      disposed = true
    }
  }, [request])

  const updateDraft = useCallback(
    <K extends keyof VideoGenerationDraft>(
      key: K,
      value: VideoGenerationDraft[K]
    ) => {
      setDraft((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const selectModel = useCallback(
    (modelId: string | null) => {
      if (!modelId) return
      const profile = profiles.find((item) => item.id === modelId)
      if (!profile) return

      setDraft((current) => ({
        ...current,
        model: modelId,
        resolution: profile.resolutions.includes(current.resolution)
          ? current.resolution
          : profile.resolutions[0],
        duration: profile.durations.includes(current.duration)
          ? current.duration
          : profile.durations[0],
        seed: profile.supportsSeed ? (current.seed ?? 1234) : undefined,
        options: {
          promptExtend: profile.advancedOptions.promptExtend
            ? (current.options.promptExtend ?? true)
            : undefined,
          watermark: profile.advancedOptions.watermark
            ? (current.options.watermark ?? false)
            : undefined,
        },
      }))
    },
    [profiles]
  )

  const setSourceImage = useCallback(
    (image: VideoSourceImage | null) => {
      if (image && !image.isExample && image.url.startsWith('blob:')) {
        objectUrls.current.add(image.url)
      }
      updateDraft('inputImage', image)
    },
    [updateDraft]
  )

  const randomizeSeed = useCallback(() => {
    updateDraft('seed', Math.floor(Math.random() * 2_147_483_647))
  }, [updateDraft])

  const submit = useCallback(async () => {
    if (!request || !request.prompt.trim()) return null

    setIsSubmitting(true)
    try {
      const task = await videoPlaygroundApi.submitVideo({
        ...request,
        prompt: request.prompt.trim(),
      })
      setTasks((current) => [task, ...current])
      setFilter('all')
      return task
    } finally {
      setIsSubmitting(false)
    }
  }, [request])

  const retryTask = useCallback(async (task: VideoTask) => {
    const retried = await videoPlaygroundApi.submitVideo(task.request)
    setTasks((current) => [retried, ...current])
    setFilter('all')
    return retried
  }, [])

  const reuseTask = useCallback(
    (task: VideoTask) => {
      const profile = profiles.find((item) => item.id === task.request.model)
      setDraft({
        model: task.request.model,
        group: task.request.group,
        prompt: task.request.prompt,
        inputImage: task.request.inputImage,
        resolution:
          profile?.resolutions.includes(task.request.resolution) === false
            ? profile.resolutions[0]
            : task.request.resolution,
        duration:
          profile?.durations.includes(task.request.duration) === false
            ? profile.durations[0]
            : task.request.duration,
        seed: profile?.supportsSeed ? task.request.seed : undefined,
        options: task.request.options,
      })
    },
    [profiles]
  )

  const filteredTasks = useMemo(
    () => filterVideoTasks(tasks, filter),
    [filter, tasks]
  )

  const taskCounts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter(isActiveTask).length,
      completed: tasks.filter((task) => task.status === 'succeeded').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
    }),
    [tasks]
  )

  return {
    draft,
    estimate,
    filter,
    filteredTasks,
    isLoading,
    isSubmitting,
    profiles,
    selectedProfile,
    taskCounts,
    updateDraft,
    selectModel,
    setSourceImage,
    randomizeSeed,
    setFilter,
    submit,
    retryTask,
    reuseTask,
  }
}
