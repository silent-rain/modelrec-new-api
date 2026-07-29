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
import { getSelf } from '@/lib/api'
import { type AuthUser, useAuthStore } from '@/stores/auth-store'

interface CurrentUserResponse {
  success?: boolean
  data?: AuthUser | null
}

type CurrentUserFetcher = () => Promise<CurrentUserResponse>
type CurrentUserSetter = (user: AuthUser) => void

export function shouldRefreshDashboardUser(section: string): boolean {
  return section === 'models'
}

export async function refreshDashboardUser(
  fetchCurrentUser: CurrentUserFetcher = getSelf,
  setUser: CurrentUserSetter = useAuthStore.getState().auth.setUser
): Promise<boolean> {
  try {
    const response = await fetchCurrentUser()
    if (!response.success || !response.data) return false

    setUser(response.data)
    return true
  } catch {
    return false
  }
}
