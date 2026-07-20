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
import { useTranslation } from 'react-i18next'

const HOME_STATS = [
  { value: '400+', label: 'Models', accent: true },
  { value: '60+', label: 'Providers', accent: false },
  { value: '8M+', label: 'Global Users', accent: false },
  { value: '100T', label: 'Monthly Tokens', accent: true },
] as const

export function Stats() {
  const { t } = useTranslation()

  return (
    <dl className='mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4'>
      {HOME_STATS.map((stat) => (
        <div key={stat.label}>
          <dd
            className={
              stat.accent
                ? 'text-3xl font-extrabold tracking-tight text-[#ff8700] md:text-4xl'
                : 'dark:text-foreground text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl'
            }
          >
            {stat.value}
          </dd>
          <dt className='text-muted-foreground mt-1 text-sm'>
            {t(stat.label)}
          </dt>
        </div>
      ))}
    </dl>
  )
}
