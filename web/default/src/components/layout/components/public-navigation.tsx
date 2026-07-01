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
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { defaultTopNavLinks } from '../config/top-nav.config'
import type { TopNavLink } from '../types'

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

interface PublicNavigationProps {
  /**
   * Custom navigation links
   * If not provided, will use dynamic links from backend or defaults
   */
  links?: TopNavLink[]
  /**
   * Additional className
   */
  className?: string
}

/**
 * Public navigation component that matches Launch UI template styling
 * Used in PublicHeader for desktop navigation
 */
export function PublicNavigation({
  links: providedLinks,
  className,
}: PublicNavigationProps = {}) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  // Use the same logic as AppHeader: prioritize dynamic links from backend
  const dynamicLinks = useTopNavLinks()
  const defaultLinks = providedLinks || defaultTopNavLinks
  const links = dynamicLinks.length > 0 ? dynamicLinks : defaultLinks
  const allHrefs = links.map((l) => l.href)

  return (
    <nav className={cn('hidden items-center gap-1 md:flex', className)}>
      {links.map((link, index) => {
        const isActive = isPathActive(pathname, link.href, allHrefs)
        // Handle external links
        if (link.external) {
          return (
            <a
              key={index}
              href={link.href}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                isActive && 'nav-link-active text-foreground',
                link.disabled && 'pointer-events-none opacity-50'
              )}
            >
              {link.title}
            </a>
          )
        }
        // Handle internal links
        return (
          <Link
            key={index}
            to={link.href}
            className={cn(
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
              isActive && 'nav-link-active text-foreground',
              link.disabled && 'pointer-events-none opacity-50'
            )}
          >
            {link.title}
          </Link>
        )
      })}
    </nav>
  )
}
