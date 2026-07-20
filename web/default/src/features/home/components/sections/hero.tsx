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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useSystemConfig } from '@/hooks/use-system-config'

import { getApiKeyDestination } from '../../lib/navigation'
import { CapabilityMap } from '../capability-map'
import { Stats } from './stats'

interface HeroProps {
  isAuthenticated: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const apiKeyDestination = getApiKeyDestination(props.isAuthenticated)
  const apiKeyLink =
    apiKeyDestination.to === '/keys' ? (
      <Link to='/keys' />
    ) : (
      <Link to='/sign-in' search={apiKeyDestination.search} />
    )

  return (
    <section className='relative overflow-hidden bg-[#f7f5f9] px-6 pt-12 pb-20 md:pb-14 dark:bg-[#17151a]'>
      <div className='mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10'>
        <div className='relative z-10'>
          <p className='text-4xl font-black tracking-[-0.055em] text-[#ff8700] md:text-6xl lg:text-[4.5rem] lg:leading-none'>
            {systemName || t('AI Routing')}
          </p>
          <h1 className='dark:text-foreground mt-6 max-w-3xl text-2xl font-bold tracking-[-0.035em] text-[#172033] md:text-4xl'>
            {t('Intelligent AI Model Recommendation and Routing Platform')}
          </h1>
          <p className='text-muted-foreground mt-6 max-w-3xl text-base leading-8 md:text-lg'>
            <Trans
              i18nKey='Discover, evaluate, route, and deliver AI models through one API, with access to <highlight>400+</highlight> models.'
              components={{
                highlight: <strong className='font-bold text-[#ff8700]' />,
              }}
            />
          </p>

          <div className='mt-9 flex flex-wrap items-center gap-4'>
            <Button
              size='lg'
              className='sf-btn-primary h-14 rounded-xl px-8 text-base font-semibold shadow-[0_12px_28px_rgba(255,135,0,0.25)]'
              render={apiKeyLink}
            >
              {t('Get API Key')}
            </Button>
            <Button
              size='lg'
              variant='outline'
              className='bg-background/80 h-14 rounded-xl border-[#d8d9dd] px-8 text-base font-semibold'
              render={<Link to='/pricing' />}
            >
              {t('Explore Models')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={1.8}
                className='size-4'
              />
            </Button>
          </div>

          <Stats />
        </div>

        <CapabilityMap />
      </div>
    </section>
  )
}
