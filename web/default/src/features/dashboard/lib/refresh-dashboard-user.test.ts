import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { AuthUser } from '@/stores/auth-store'

import {
  refreshDashboardUser,
  shouldRefreshDashboardUser,
} from './refresh-dashboard-user'

const refreshedUser: AuthUser = {
  id: 2,
  username: 'chu',
  role: 1,
  quota: 7000,
  used_quota: 3500,
  request_count: 12,
}

describe('dashboard user refresh', () => {
  test('runs only when entering the models usage section', () => {
    assert.equal(shouldRefreshDashboardUser('models'), true)
    assert.equal(shouldRefreshDashboardUser('flow'), false)
    assert.equal(shouldRefreshDashboardUser('overview'), false)
    assert.equal(shouldRefreshDashboardUser('users'), false)
  })

  test('writes the latest user into the auth store after a successful fetch', async () => {
    const received: AuthUser[] = []

    const refreshed = await refreshDashboardUser(
      async () => ({ success: true, data: refreshedUser }),
      (user) => received.push(user)
    )

    assert.equal(refreshed, true)
    assert.deepEqual(received, [refreshedUser])
  })

  test('keeps the cached user when the API response is unsuccessful', async () => {
    let writeCount = 0

    const refreshed = await refreshDashboardUser(
      async () => ({ success: false }),
      () => {
        writeCount += 1
      }
    )

    assert.equal(refreshed, false)
    assert.equal(writeCount, 0)
  })

  test('keeps route navigation available when refreshing throws', async () => {
    const refreshed = await refreshDashboardUser(
      async () => {
        throw new Error('network unavailable')
      },
      () => assert.fail('setUser must not be called')
    )

    assert.equal(refreshed, false)
  })
})
