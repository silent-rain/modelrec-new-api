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
  AiMagicIcon,
  ArtificialIntelligence04Icon,
  ChartEvaluationIcon,
  News01Icon,
  Rocket01Icon,
  Route01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const CAPABILITIES = [
  {
    label: 'Information',
    icon: News01Icon,
    className: 'left-1/2 top-0 -translate-x-1/2',
    iconClassName: 'text-[#ff9a19]',
    animationDelay: '0s',
    animationDuration: '4.8s',
  },
  {
    label: 'Recommendation',
    icon: AiMagicIcon,
    className: 'right-0 top-[22%]',
    iconClassName: 'text-[#ff9a19]',
    animationDelay: '-1.1s',
    animationDuration: '5.2s',
  },
  {
    label: 'Evaluation',
    icon: ChartEvaluationIcon,
    className: 'right-0 bottom-[20%]',
    iconClassName: 'text-[#00865b]',
    animationDelay: '-2.2s',
    animationDuration: '4.6s',
  },
  {
    label: 'Routing',
    icon: Route01Icon,
    className: 'bottom-0 left-1/2 -translate-x-1/2',
    iconClassName: 'text-[#ff9a19]',
    animationDelay: '-0.7s',
    animationDuration: '5.4s',
  },
  {
    label: 'Distribution',
    icon: Rocket01Icon,
    className: 'left-0 top-1/2 -translate-y-1/2',
    iconClassName: 'text-[#ff9a19]',
    animationDelay: '-1.8s',
    animationDuration: '5s',
  },
] as const

export function CapabilityMap() {
  const { t } = useTranslation()

  return (
    <div
      className='relative mx-auto h-[390px] w-full max-w-[390px] md:h-[440px] md:max-w-[440px]'
      aria-label={t('AI model service capabilities')}
    >
      <div className='absolute top-1/2 left-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-[#ff8700] text-white shadow-[0_18px_42px_rgba(255,135,0,0.28)] md:size-40'>
        <HugeiconsIcon
          icon={ArtificialIntelligence04Icon}
          strokeWidth={1.8}
          className='size-16 md:size-20'
        />
      </div>

      {CAPABILITIES.map((capability) => (
        <div
          key={capability.label}
          className={cn('absolute', capability.className)}
        >
          <div
            className='sf-home-float bg-card border-border/60 flex size-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border shadow-[0_12px_30px_rgba(15,23,42,0.1)] md:size-20'
            style={{
              animationDelay: capability.animationDelay,
              animationDuration: capability.animationDuration,
            }}
          >
            <HugeiconsIcon
              icon={capability.icon}
              strokeWidth={1.8}
              className={cn('size-6', capability.iconClassName)}
            />
            <span className='text-[11px] font-semibold'>
              {t(capability.label)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
