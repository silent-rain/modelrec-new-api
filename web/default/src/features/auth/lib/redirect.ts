const DEFAULT_AUTH_REDIRECT = '/dashboard'

export function resolveAuthRedirect(
  redirectTo: string | undefined,
  currentOrigin: string
): string {
  if (!redirectTo) {
    return DEFAULT_AUTH_REDIRECT
  }

  try {
    const target = new URL(redirectTo, currentOrigin)
    if (target.origin !== currentOrigin) {
      return DEFAULT_AUTH_REDIRECT
    }

    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return DEFAULT_AUTH_REDIRECT
  }
}
