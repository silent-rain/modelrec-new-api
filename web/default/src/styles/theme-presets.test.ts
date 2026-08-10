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
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

const themePresetsCss = readFileSync(
  new URL('./theme-presets.css', import.meta.url),
  'utf8'
)

describe('orange-green button theme selectors', () => {
  test('only treats an exact bg-primary class as a solid primary button', () => {
    assert.doesNotMatch(themePresetsCss, /button\[class\*=["']bg-primary["']\]/)
    assert.match(
      themePresetsCss,
      /\[data-theme-preset='orange-green'\] button\[class~="bg-primary"\]/
    )
    assert.match(
      themePresetsCss,
      /\.dark \[data-theme-preset='orange-green'\] button\[class~="bg-primary"\]/
    )
  })
})

describe('orange-green floating surface isolation', () => {
  test('marks shared floating surface primitives explicitly', () => {
    const floatingSurfaceFiles = [
      '../components/ui/combobox.tsx',
      '../components/ui/combobox-input.tsx',
      '../components/ui/context-menu.tsx',
      '../components/ui/dropdown-menu.tsx',
      '../components/ui/hover-card.tsx',
      '../components/ui/navigation-menu.tsx',
      '../components/ui/popover.tsx',
      '../components/ui/select.tsx',
      '../components/ui/tooltip.tsx',
    ]

    for (const file of floatingSurfaceFiles) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      assert.match(source, /data-theme-surface='floating'/, file)
    }
  })

  test('keeps broad card selectors away from floating surfaces', () => {
    const broadCardSelectors = themePresetsCss
      .split('\n')
      .filter(
        (line) =>
          line.includes('[class*="rounded-lg"][class*="border"]') &&
          line.includes(":not([data-slot='popover-content'])") &&
          !line.includes('[data-topup-amount-card]') &&
          !line.includes('[data-payment-method]')
      )

    assert.ok(broadCardSelectors.length > 0)
    for (const selector of broadCardSelectors) {
      assert.match(
        selector,
        /:not\(\[data-theme-surface='floating'\]\)/,
        selector
      )
    }
  })
})
