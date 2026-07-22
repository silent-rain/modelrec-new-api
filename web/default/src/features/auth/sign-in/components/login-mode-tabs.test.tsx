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
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import { LoginModeTabs } from './login-mode-tabs'

const testI18n = createInstance()
await testI18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Authentication navigation': 'Authentication navigation',
        'Phone Login': 'Phone Login',
        'Password Login': 'Password Login',
      },
    },
  },
})

function renderTabs(mode: 'sms' | 'password'): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={testI18n}>
      <LoginModeTabs mode={mode} onModeChange={() => undefined} />
    </I18nextProvider>
  )
}

describe('LoginModeTabs', () => {
  test('marks phone login as selected', () => {
    const markup = renderTabs('sms')

    assert.match(markup, /role="tablist"/)
    assert.match(markup, /aria-selected="true"[^>]*>Phone Login/)
    assert.match(markup, /aria-selected="false"[^>]*>Password Login/)
    assert.match(markup, /aria-selected="true"[^>]*border-primary/)
    assert.doesNotMatch(markup, /aria-selected="true"[^>]*bg-primary/)
  })

  test('marks password login as selected', () => {
    const markup = renderTabs('password')

    assert.match(markup, /aria-selected="false"[^>]*>Phone Login/)
    assert.match(markup, /aria-selected="true"[^>]*>Password Login/)
  })
})
