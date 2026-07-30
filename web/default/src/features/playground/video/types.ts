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
export type VideoTaskType = 'image-to-video'
export type VideoTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed'
export type VideoTaskFilter = 'all' | 'active' | 'completed' | 'failed'

export type VideoModelProfile = {
  id: string
  label: string
  vendor: string
  description: string
  supportedTasks: VideoTaskType[]
  resolutions: string[]
  durations: number[]
  maxImageSizeMb: number
  minImageEdge: number
  aspectRatioRange: [number, number]
  supportsSeed: boolean
  advancedOptions: {
    promptExtend?: boolean
    watermark?: boolean
  }
  estimatedCost: number
}

export type VideoSourceImage = {
  url: string
  name: string
  width: number
  height: number
  size: number
  file?: File
  isExample?: boolean
}

export type ImageToVideoRequest = {
  model: string
  group: string
  taskType: VideoTaskType
  prompt: string
  inputImage: VideoSourceImage
  resolution: string
  duration: number
  seed?: number
  options: {
    promptExtend?: boolean
    watermark?: boolean
  }
}

export type VideoGenerationDraft = Omit<
  ImageToVideoRequest,
  'taskType' | 'inputImage'
> & {
  inputImage: VideoSourceImage | null
}

export type VideoTaskErrorCode = 'source_image_rejected' | 'generation_failed'

export type VideoTask = {
  id: string
  status: VideoTaskStatus
  progress: number
  request: ImageToVideoRequest
  modelLabel: string
  createdAt: string
  updatedAt: string
  errorCode?: VideoTaskErrorCode
}

export type VideoEstimate = {
  amount: number
  currency: 'CNY'
}

export interface VideoPlaygroundAdapter {
  listVideoModels(): Promise<VideoModelProfile[]>
  listVideoTasks(): Promise<VideoTask[]>
  estimateVideo(request: ImageToVideoRequest): Promise<VideoEstimate>
  submitVideo(request: ImageToVideoRequest): Promise<VideoTask>
  getVideoTask(taskId: string): Promise<VideoTask | null>
}
