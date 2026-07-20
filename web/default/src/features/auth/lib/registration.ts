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
import type { RegisterFormValues } from '../constants'
import type { HumanVerificationPayload, RegisterPayload } from '../types'

export function buildRegisterPayload(
  values: RegisterFormValues,
  affiliateCode: string | null | undefined,
  verification: HumanVerificationPayload
): RegisterPayload {
  const identity =
    values.registrationMethod === 'email'
      ? { email: values.email.trim() }
      : { phone: values.phone.trim() }

  return {
    username: values.username.trim(),
    password: values.password,
    verification_code: values.verification_code.trim(),
    aff_code: affiliateCode || undefined,
    ...identity,
    ...verification,
  }
}
