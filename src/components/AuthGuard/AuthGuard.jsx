import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../../api/loginApi.js'
import { ROUTES } from '../../constants/routes.js'
import './AuthGuard.css'

/**
 * Shared authentication guard for every protected route.
 *
 * It verifies the HttpOnly cookie before the first protected page is rendered,
 * remembers the requested URL, and verifies again when the user changes pages.
 */
export default function AuthGuard() {
  const location = useLocation()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    getCurrentUser().then((result) => {
      if (!cancelled) setStatus(result.ok ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search])

  if (status === 'checking') {
    return (
      <div className="auth-guard-loading" role="status" aria-live="polite">
        <span className="auth-guard-seal" aria-hidden="true">
          {'\u53e4'}
        </span>
        <span>{'\u6b63\u5728\u6838\u9a8c\u4fee\u590d\u5e08\u8eab\u4efd\u2026'}</span>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={ROUTES.LOGIN} replace state={{ from }} />
  }

  return <Outlet />
}
