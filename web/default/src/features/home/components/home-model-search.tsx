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
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getPricingSearch } from '../lib/navigation'

export function HomeModelSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate({ to: '/pricing', search: getPricingSearch(query) })
  }

  return (
    <form className='relative' role='search' onSubmit={handleSubmit}>
      <label className='sr-only' htmlFor='home-model-search'>
        {t('Search models')}
      </label>
      <button
        type='submit'
        className='text-muted-foreground hover:text-foreground absolute top-1/2 left-3 z-10 -translate-y-1/2 transition-colors'
        aria-label={t('Search models')}
      >
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={1.8}
          className='size-4'
        />
      </button>
      <input
        id='home-model-search'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('Search models...')}
        className='placeholder:text-muted-foreground/70 focus:border-primary/40 h-10 w-56 rounded-lg border border-transparent bg-[#f3f4f6] pr-3 pl-10 text-sm transition-colors outline-none focus:bg-white dark:bg-white/8 dark:focus:bg-white/12'
      />
    </form>
  )
}
