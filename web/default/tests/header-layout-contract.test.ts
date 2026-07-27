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
import { describe, expect, test } from 'bun:test'

const readSource = (path: string) =>
  Bun.file(new URL(`../src/${path}`, import.meta.url)).text()

describe('header layout contract', () => {
  test('uses one 64px height token for all header layouts', async () => {
    const theme = await readSource('styles/theme.css')

    expect(theme).toContain('--header-height: 4rem;')
    expect(theme).toContain('--app-header-height: var(--header-height);')
  })

  test('keeps the homepage hero title compact and brand orange', async () => {
    const hero = await readSource('features/home/components/sections/hero.tsx')

    expect(hero).toContain(
      "className='max-w-3xl text-3xl leading-[1.12] font-bold tracking-normal text-[#FF8A00] md:text-4xl lg:text-[45px]'"
    )
    expect(hero).toContain("// import { Stats } from './stats'")
    expect(hero).toContain('{/* <Stats /> */}')
    expect(hero).not.toContain('<highlight>400+</highlight>')
  })

  test('keeps the existing headers on the sticky shared-height contract', async () => {
    const [homeHeader, publicHeader, appHeader] = await Promise.all([
      readSource('features/home/components/home-header.tsx'),
      readSource('components/layout/components/public-header.tsx'),
      readSource('components/layout/components/header.tsx'),
    ])

    expect(homeHeader).toContain(
      'sticky top-0 z-50 h-[var(--header-height,4rem)]'
    )
    expect(publicHeader).toContain(
      'sticky top-0 z-50 h-[var(--header-height,4rem)]'
    )
    expect(publicHeader).toContain(
      'pointer-events-auto flex h-full items-center'
    )
    expect(appHeader).toContain(
      'sticky top-0 z-50 h-[var(--header-height,4rem)]'
    )
  })

  test('matches the prototype navigation typography', async () => {
    const [homeHeader, publicHeader, theme, stylesheet] = await Promise.all([
      readSource('features/home/components/home-header.tsx'),
      readSource('components/layout/components/public-header.tsx'),
      readSource('styles/theme.css'),
      readSource('styles/index.css'),
    ])

    expect(theme).toContain('--font-navigation:')
    expect(theme).toContain("'Inter Variable', 'Inter', system-ui")
    expect(stylesheet).toContain("@import '@fontsource-variable/inter';")

    for (const header of [homeHeader, publicHeader]) {
      expect(header).toContain('[font-family:var(--font-navigation)]')
      expect(header).toContain('text-xl font-bold tracking-tight')
      expect(header).toContain('text-sm font-medium')
      expect(header).not.toContain('text-[13px] font-medium')
    }

    expect(publicHeader).toContain(
      'text-foreground nav-link-active font-semibold'
    )
  })

  test('removes fixed-header compensation from public page content', async () => {
    const [layout, pricing, rankings, hero, docs] = await Promise.all([
      readSource('components/layout/components/public-layout.tsx'),
      readSource('features/pricing/index.tsx'),
      readSource('features/rankings/index.tsx'),
      readSource('features/home/components/sections/hero.tsx'),
      readSource('features/docs/index.tsx'),
    ])

    expect(layout).not.toContain('py-6 pt-20')
    expect(pricing).toContain('pt-0')
    expect(pricing).toContain('sm:pt-4')
    expect(rankings).toContain('pt-0')
    expect(rankings).toContain('sm:pt-4')
    expect(hero).toContain('pt-12')
    expect(docs).toContain('pt-12')
    expect(docs).toContain('md:pt-20')
  })
})
