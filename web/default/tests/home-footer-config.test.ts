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

const readHomeFooterSource = () =>
  Bun.file(
    new URL('../src/features/home/components/home-footer.tsx', import.meta.url)
  ).text()

const readLocale = async (locale: 'en' | 'zh') =>
  Bun.file(
    new URL(`../src/i18n/locales/${locale}.json`, import.meta.url)
  ).json()

describe('home footer configuration contract', () => {
  test('uses the configured footer HTML only for the bottom notice', async () => {
    const source = await readHomeFooterSource()

    expect(source).toContain(
      'const { systemName, footerHtml } = useSystemConfig()'
    )
    expect(source).toContain('const customFooterHtml = footerHtml?.trim()')
    expect(source).toContain(
      'dangerouslySetInnerHTML={{ __html: customFooterHtml }}'
    )
    expect(source).toContain("t('footer.defaultCopyright')")
  })

  test('keeps the required project attribution outside the configurable notice', async () => {
    const source = await readHomeFooterSource()
    const customNoticeIndex = source.indexOf('dangerouslySetInnerHTML')
    const attributionIndex = source.indexOf('<ProjectAttribution')

    expect(customNoticeIndex).toBeGreaterThan(-1)
    expect(attributionIndex).toBeGreaterThan(customNoticeIndex)
    expect(source).toContain('<LegalLinks leadingSeparator />')
    expect(source).toContain("from '@/components/layout/components/footer'")
  })

  test('keeps the upstream New API project name in footer translations', async () => {
    const [english, chinese] = await Promise.all([
      readLocale('en'),
      readLocale('zh'),
    ])

    expect(english.translation['New API']).toBe('New API')
    expect(chinese.translation['New API']).toBe('New API')
  })
})
