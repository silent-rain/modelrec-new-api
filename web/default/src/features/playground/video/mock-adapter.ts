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
import type {
  ImageToVideoRequest,
  VideoEstimate,
  VideoModelProfile,
  VideoPlaygroundAdapter,
  VideoSourceImage,
  VideoTask,
} from './types'

const SAMPLE_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#172554"/><stop offset="0.55" stop-color="#7c3aed"/><stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#0f172a"/><stop offset="1" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <circle cx="990" cy="170" r="78" fill="#fde68a" opacity=".92"/>
  <path d="M0 490 240 290 450 485 650 250 910 500 1080 330 1280 490V720H0Z" fill="#111827" opacity=".82"/>
  <path d="M0 570 1280 500V720H0Z" fill="url(#road)"/>
  <path d="M500 720 760 510" stroke="#f8fafc" stroke-width="12" stroke-dasharray="38 30" opacity=".8"/>
  <g transform="translate(690 440)">
    <path d="M0 70 75 15h165l82 56-20 70H16Z" fill="#f97316"/>
    <path d="m95 28 28-45h91l36 45Z" fill="#bae6fd" opacity=".82"/>
    <circle cx="73" cy="138" r="35" fill="#0f172a"/><circle cx="255" cy="138" r="35" fill="#0f172a"/>
  </g>
</svg>`

export const SAMPLE_SOURCE_IMAGE: VideoSourceImage = {
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_IMAGE_SVG)}`,
  name: 'sunset-road-example.svg',
  width: 1280,
  height: 720,
  size: 0,
  isExample: true,
}

export const MOCK_VIDEO_MODELS: VideoModelProfile[] = [
  {
    id: 'wanx2.1-i2v-turbo',
    label: 'Wan 2.1 I2V Turbo',
    vendor: 'Alibaba Cloud',
    description: 'Fast generation for concept previews and motion drafts.',
    supportedTasks: ['image-to-video'],
    resolutions: ['720P', '1080P'],
    durations: [5, 10],
    maxImageSizeMb: 20,
    minImageEdge: 300,
    aspectRatioRange: [0.4, 2.5],
    supportsSeed: true,
    advancedOptions: { promptExtend: true, watermark: true },
    estimatedCost: 1.2,
  },
  {
    id: 'kling-v1.6-pro',
    label: 'Kling 1.6 Pro',
    vendor: 'Kuaishou',
    description: 'Stable motion and richer visual detail for final concepts.',
    supportedTasks: ['image-to-video'],
    resolutions: ['720P', '1080P'],
    durations: [5, 10],
    maxImageSizeMb: 10,
    minImageEdge: 300,
    aspectRatioRange: [0.4, 2.5],
    supportsSeed: true,
    advancedOptions: { promptExtend: true, watermark: false },
    estimatedCost: 2.4,
  },
  {
    id: 'vidu2.0-i2v',
    label: 'Vidu 2.0 I2V',
    vendor: 'ShengShu',
    description: 'Responsive camera motion for short-form creative content.',
    supportedTasks: ['image-to-video'],
    resolutions: ['720P'],
    durations: [4, 8],
    maxImageSizeMb: 10,
    minImageEdge: 256,
    aspectRatioRange: [0.5, 2],
    supportsSeed: false,
    advancedOptions: { promptExtend: true, watermark: true },
    estimatedCost: 0.9,
  },
]

function createTaskId() {
  return `vid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function createRequest(
  overrides: Partial<ImageToVideoRequest> = {}
): ImageToVideoRequest {
  return {
    model: MOCK_VIDEO_MODELS[0].id,
    group: 'default',
    taskType: 'image-to-video',
    prompt: 'A cinematic tracking shot follows the car into the sunset.',
    inputImage: SAMPLE_SOURCE_IMAGE,
    resolution: '1080P',
    duration: 5,
    seed: 1234,
    options: { promptExtend: true, watermark: false },
    ...overrides,
  }
}

function buildInitialTasks(): VideoTask[] {
  const now = Date.now()
  return [
    {
      id: 'vid_demo_complete',
      status: 'succeeded',
      progress: 100,
      request: createRequest({
        prompt:
          'The sports car accelerates toward the horizon, cinematic light.',
      }),
      modelLabel: MOCK_VIDEO_MODELS[0].label,
      createdAt: new Date(now - 13 * 60_000).toISOString(),
      updatedAt: new Date(now - 12 * 60_000).toISOString(),
    },
    {
      id: 'vid_demo_failed',
      status: 'failed',
      progress: 36,
      request: createRequest({
        model: MOCK_VIDEO_MODELS[1].id,
        resolution: '720P',
        prompt: 'Add subtle cloud movement and a slow camera push-in.',
      }),
      modelLabel: MOCK_VIDEO_MODELS[1].label,
      createdAt: new Date(now - 26 * 60_000).toISOString(),
      updatedAt: new Date(now - 25 * 60_000).toISOString(),
      errorCode: 'generation_failed',
    },
  ]
}

const taskCache = new Map<string, VideoTask>()

export const mockVideoPlaygroundAdapter: VideoPlaygroundAdapter = {
  async listVideoModels() {
    return MOCK_VIDEO_MODELS
  },

  async listVideoTasks() {
    const tasks = buildInitialTasks()
    tasks.forEach((task) => taskCache.set(task.id, task))
    return tasks
  },

  async estimateVideo(request): Promise<VideoEstimate> {
    const profile = MOCK_VIDEO_MODELS.find((item) => item.id === request.model)
    const resolutionFactor = request.resolution === '1080P' ? 1.5 : 1
    const durationFactor = request.duration / 5
    return {
      amount: Number(
        (
          (profile?.estimatedCost ?? 1) *
          resolutionFactor *
          durationFactor
        ).toFixed(2)
      ),
      currency: 'CNY',
    }
  },

  async submitVideo(request) {
    const profile = MOCK_VIDEO_MODELS.find((item) => item.id === request.model)
    const timestamp = new Date().toISOString()
    const task: VideoTask = {
      id: createTaskId(),
      status: 'queued',
      progress: 0,
      request,
      modelLabel: profile?.label ?? request.model,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    taskCache.set(task.id, task)
    return task
  },

  async getVideoTask(taskId) {
    return taskCache.get(taskId) ?? null
  },
}
