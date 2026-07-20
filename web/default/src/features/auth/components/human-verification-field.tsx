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
import { Turnstile } from '@/components/turnstile'

import type { HumanVerificationController } from '../hooks/use-human-verification'

type HumanVerificationFieldProps = {
  verification: HumanVerificationController
}

export function HumanVerificationField({
  verification,
}: HumanVerificationFieldProps) {
  if (verification.config.provider === 'turnstile') {
    return (
      <Turnstile
        siteKey={verification.config.siteKey}
        onVerify={verification.setTurnstileToken}
      />
    )
  }

  if (verification.config.provider === 'aliyun') {
    return (
      <div className='h-0 overflow-hidden' aria-hidden='true'>
        <div id={verification.aliyun.elementId} />
        <button id={verification.aliyun.buttonId} type='button' tabIndex={-1} />
      </div>
    )
  }

  return null
}
