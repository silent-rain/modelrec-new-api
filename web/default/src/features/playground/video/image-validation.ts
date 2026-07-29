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
import type { VideoModelProfile, VideoSourceImage } from './types'

export type ImageValidationError =
  | 'unsupported_format'
  | 'file_too_large'
  | 'image_too_small'
  | 'invalid_aspect_ratio'
  | 'image_unreadable'

export const IMAGE_VALIDATION_MESSAGES: Record<ImageValidationError, string> = {
  unsupported_format: 'Upload a JPG, PNG, BMP, or WebP image.',
  file_too_large: 'The image exceeds the {{size}} MB limit.',
  image_too_small: 'The shortest image edge must be at least {{edge}} px.',
  invalid_aspect_ratio:
    'The image aspect ratio is outside the supported range.',
  image_unreadable: 'The image could not be read. Try another file.',
}

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/webp',
])

function readImageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    )
    image.addEventListener('error', () => reject(new Error('image_unreadable')))
    image.src = url
  })
}

export async function validateImageFile(
  file: File,
  profile: VideoModelProfile
): Promise<
  | { ok: true; image: VideoSourceImage }
  | { ok: false; error: ImageValidationError }
> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'unsupported_format' }
  }

  if (file.size > profile.maxImageSizeMb * 1024 * 1024) {
    return { ok: false, error: 'file_too_large' }
  }

  const url = URL.createObjectURL(file)
  try {
    const { width, height } = await readImageSize(url)
    if (Math.min(width, height) < profile.minImageEdge) {
      URL.revokeObjectURL(url)
      return { ok: false, error: 'image_too_small' }
    }

    const ratio = width / height
    if (
      ratio < profile.aspectRatioRange[0] ||
      ratio > profile.aspectRatioRange[1]
    ) {
      URL.revokeObjectURL(url)
      return { ok: false, error: 'invalid_aspect_ratio' }
    }

    return {
      ok: true,
      image: { url, name: file.name, width, height, size: file.size, file },
    }
  } catch {
    URL.revokeObjectURL(url)
    return { ok: false, error: 'image_unreadable' }
  }
}
