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
import { useMemo } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type TopNavLink } from '../types'

/**
 * 判断当前路径是否匹配链接（支持子路由）
 * - "/" 仅精确匹配 "/"
 * - 其他路径支持前缀匹配，如 "/dashboard" 匹配 "/dashboard/overview"
 * - "/dashboard" 特殊处理：作为内部页面的兜底，当当前路径不匹配任何其他导航项时保持激活
 */
function isPathActive(
  pathname: string,
  href: string,
  allHrefs?: string[]
): boolean {
  if (href === '/') return pathname === '/'
  if (pathname === href || pathname.startsWith(href + '/')) return true

  // /dashboard 作为已认证内部页面的兜底激活项
  if (href === '/dashboard' && allHrefs && allHrefs.length > 0) {
    // 主页 "/" 有自己的导航项，不应触发控制台兜底
    if (pathname === '/') return false
    const otherHrefs = allHrefs.filter((h) => h !== '/' && h !== '/dashboard')
    const matchesOther = otherHrefs.some(
      (h) => pathname === h || pathname.startsWith(h + '/')
    )
    const authExcluded = [
      '/sign-in', '/sign-up', '/forgot-password', '/reset-password',
    ]
    const isAuthPage = authExcluded.some((p) => pathname.startsWith(p))
    return !matchesOther && !isAuthPage
  }

  return false
}

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: TopNavLink[]
}

/**
 * 顶部导航栏组件
 * 在大屏幕显示水平导航，在小屏幕显示下拉菜单
 */
export function TopNav({ className, links, ...props }: TopNavProps) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  // 规范化链接，计算激活状态
  const allHrefs = links.map((l) => l.href)
  const normalizedLinks = useMemo(
    () =>
      links.map((link) => ({
        disabled: false,
        external: false,
        ...link,
        isActive: isPathActive(pathname, link.href, allHrefs),
      })),
    [links, pathname, allHrefs]
  )

  return (
    <>
      {/* 移动端下拉菜单 */}
      <div className='lg:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={<Button size='icon' variant='outline' className='size-7' />}
          >
            <Menu />
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {normalizedLinks.map(
              ({ title, href, isActive, disabled, external }) => (
                <DropdownMenuItem
                  key={`${title}-${href}`}
                  render={
                    external ? (
                      <a
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={cn(isActive ? 'nav-link-active' : 'text-muted-foreground')}
                      >
                        {title}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className={cn(isActive ? 'nav-link-active' : 'text-muted-foreground')}
                        disabled={disabled}
                      >
                        {title}
                      </Link>
                    )
                  }
                ></DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 桌面端水平导航 */}
      <nav
        className={cn(
          'top-nav-links hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6',
          className
        )}
        {...props}
      >
        {normalizedLinks.map(({ title, href, isActive, disabled, external }) =>
          external ? (
            <a
              key={`${title}-${href}`}
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'nav-link-active text-foreground' : 'text-muted-foreground'
              )}
            >
              {title}
            </a>
          ) : (
            <Link
              key={`${title}-${href}`}
              to={href}
              disabled={disabled}
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'nav-link-active text-foreground' : 'text-muted-foreground'
              )}
            >
              {title}
            </Link>
          )
        )}
      </nav>
    </>
  )
}
