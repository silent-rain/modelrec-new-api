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

const readAboutSource = () =>
  Bun.file(new URL('../src/features/about/index.tsx', import.meta.url)).text()

const locales = ['en', 'fr', 'ja', 'ru', 'vi', 'zh'] as const

describe('about page contract', () => {
  test('matches the prototype content structure without unsupported data', async () => {
    const source = await readAboutSource()

    expect(source).toContain("titleKey: 'about.aboutUs'")
    expect(source).toContain("titleKey: 'about.vision'")
    expect(source).toContain("titleKey: 'about.mission'")
    expect(source).toContain("titleKey: 'about.whatWeDo'")
    expect(source).not.toContain('100+')
    expect(source).not.toContain('HeroBackground')
  })

  test('uses the responsive value grid and shared brand footer', async () => {
    const source = await readAboutSource()

    expect(source).toContain(
      'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
    )
    expect(source).toContain('border-l-4 border-[#007B43]')
    expect(source).toContain('<HomeFooter />')
  })

  test('matches the prototype colors and value sizing', async () => {
    const source = await readAboutSource()
    const chinese = await Bun.file(
      new URL('../src/i18n/locales/zh.json', import.meta.url)
    ).json()

    expect(source).toContain('bg-[#FAFAF5]')
    expect(source).toContain('bg-white py-8 md:py-12')
    expect(source).toContain('border-[#F3F4F6] bg-[#F9FAFB]')
    expect(source).toContain('text-[23px] leading-7 font-medium text-[#F97316]')
    expect(source).toContain(
      'style={{ borderTop: `4px solid ${item.accent}` }}'
    )
    expect(source).toContain("className='h-12 w-12'")
    expect(source).toContain('style={{ color: item.accent }}')
    expect(source).toContain('text-lg leading-7 font-bold text-[#111827]')
    expect(source).not.toContain('rounded-full')
    for (const icon of [
      'PiShieldCheck',
      'PiScales',
      'PrototypeHeartStraightIcon',
      'PrototypeTrendUpIcon',
      'PrototypeLightningIcon',
    ]) {
      expect(source).toContain(icon)
    }
    expect(source).toContain('M223 57a58.07 58.07 0 0 0-81.92-.1L128 69.05')
    expect(source).toContain('M240 56v64a8 8 0 0 1-16 0V75.31l-82.34 82.35')
    expect(source).toContain('M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9')
    expect(chinese.translation['about.subtitle']).toBe(
      '全球领先的大模型路由与价值交付基础设施'
    )
    expect(chinese.translation['about.whatWeDoDescription']).toBe(
      '我们解决大模型“选不准、用不好”的痛点。通过自研的评测体系（神农）与推荐引擎（苏格拉底），叠加多模态模型聚合（燧人），为用户提供从资讯、决策到应用的一站式最优解。目前已接入100+模型，即将上线智能路由，最大化AI应用效能。'
    )
  })

  test('keeps administrator-provided URL, HTML, and Markdown rendering', async () => {
    const source = await readAboutSource()

    expect(source).toContain('isValidUrl(rawContent)')
    expect(source).toContain('isLikelyHtml(rawContent)')
    expect(source).toContain('dangerouslySetInnerHTML')
    expect(source).toContain('<Markdown')
  })

  test('provides the new narrative content in every supported locale', async () => {
    for (const locale of locales) {
      const resource = await Bun.file(
        new URL(`../src/i18n/locales/${locale}.json`, import.meta.url)
      ).json()
      const translation = resource.translation

      expect(translation['about.vision']).toBeTruthy()
      expect(translation['about.visionDescription']).toBeTruthy()
      expect(translation['about.missionDescription']).toBeTruthy()
      expect(translation['about.whatWeDo']).toBeTruthy()
      expect(translation['about.whatWeDoDescription']).toBeTruthy()
    }
  })
})
