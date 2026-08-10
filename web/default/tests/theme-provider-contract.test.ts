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

const readThemeProvider = () =>
  Bun.file(new URL('../src/context/theme-provider.tsx', import.meta.url)).text()

describe('theme provider contract', () => {
  test('defaults new visitors to dark mode', async () => {
    const provider = await readThemeProvider()

    expect(provider).toContain("const DEFAULT_THEME: Theme = 'dark'")
    expect(provider).toContain("resolvedTheme: 'dark'")
    expect(provider).toContain('defaultTheme = DEFAULT_THEME')
    expect(provider).toContain('getStoredTheme(storageKey, defaultTheme)')
  })
})
