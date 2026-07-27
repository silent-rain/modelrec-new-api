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

import { AuthPasswordInput } from './auth-password-input'

const testI18n = createInstance()
await testI18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Show password': 'Show password',
        'Hide password': 'Hide password',
      },
    },
  },
})

interface RenderPasswordInputOptions {
  appearance?: 'default' | 'sign-in'
  showLeadingIcon?: boolean
}

function renderPasswordInput(options: RenderPasswordInputOptions = {}): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={testI18n}>
      <AuthPasswordInput
        aria-label='Password'
        appearance={options.appearance}
        showLeadingIcon={options.showLeadingIcon}
      />
    </I18nextProvider>
  )
}

describe('AuthPasswordInput', () => {
  test('keeps the lock icon by default', () => {
    assert.match(renderPasswordInput(), /lucide-lock/)
  })

  test('can hide the lock icon for the compact login design', () => {
    const markup = renderPasswordInput({ showLeadingIcon: false })

    assert.doesNotMatch(markup, /lucide-lock/)
    assert.doesNotMatch(markup, /showLeadingIcon/)
  })

  test('uses the dedicated sign-in surface without legacy auth overrides', () => {
    const markup = renderPasswordInput({
      appearance: 'sign-in',
      showLeadingIcon: false,
    })

    assert.match(markup, /\bsf-sign-in-input\b/)
    assert.doesNotMatch(markup, /\bsf-auth-input\b/)
  })
})
