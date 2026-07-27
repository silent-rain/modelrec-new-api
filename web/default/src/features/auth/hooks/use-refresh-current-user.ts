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
import { useEffect } from 'react'

import { getSelf } from '@/lib/api'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'

/**
 * Refetch the current user (self) on mount and sync it into the global auth
 * store.
 *
 * The auth store's `user`（含 quota/余额）是登录时写入并持久化到 localStorage 的
 * 快照，客户端切页不会自动刷新，只有硬刷新才会重新 bootstrap。凡是从 store 读取
 * 余额展示的页面（如 dashboard/models 的充值余额卡片），挂载时调用本 hook 即可让
 * 余额反映服务端最新值，而无需强制刷新页面。
 */
export function useRefreshCurrentUser() {
  const setUser = useAuthStore((s) => s.auth.setUser)

  useEffect(() => {
    let active = true
    getSelf()
      .then((res) => {
        if (active && res?.success && res.data) {
          setUser(res.data as AuthUser)
        }
      })
      .catch(() => {
        // 静默失败：保留 store 中已有的用户值，不打断页面
      })
    return () => {
      active = false
    }
  }, [setUser])
}
