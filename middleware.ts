import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-next'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 🔒 SICHERE COOKIES ERZWINGEN
            const secureOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              maxAge: 60 * 60 * 24 * 7 // 7 Tage
            }
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, secureOptions)
          })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  console.log(`[Middleware] ${pathname} - User: ${user?.email || 'nicht eingeloggt'}`)

  // ✅ ÖFFENTLICHE ROUTEN (KEIN LOGIN NÖTIG)
  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/auth/callback' ||
    pathname === '/add-money/success' ||  // 🔥 WICHTIG!
    pathname.startsWith('/api/')          // API-Routen erlauben

  // ✅ GESCHÜTZTE ROUTEN (LOGIN NÖTIG)
  const isProtectedPage = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/transfer') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/add-money') ||   // Add Money ist geschützt (außer Success)
    pathname.startsWith('/withdraw') ||
    pathname.startsWith('/receive') ||
    pathname.startsWith('/merchant') ||
    pathname.startsWith('/pay')

  // 🔓 Öffentliche Routen immer durchlassen
  if (isPublicPath) {
    console.log(`[Middleware] 🔓 Öffentliche Route: ${pathname}`)
    return response
  }

  // ❌ Nicht eingeloggt + geschützte Seite → redirect
  if (!user && isProtectedPage) {
    console.log(`[Middleware] 🔒 Nicht eingeloggt auf ${pathname} -> /login`)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // ✅ Eingeloggt + Login-Seite → redirect
  if (user && pathname === '/login') {
    console.log(`[Middleware] ✅ Eingeloggt auf /login -> /dashboard`)
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/transfer/:path*',
    '/profile/:path*',
    '/transactions/:path*',
    '/add-money/:path*',
    '/withdraw/:path*',
    '/receive/:path*',
    '/merchant/:path*',
    '/pay/:path*',
    '/auth/callback',
    '/api/:path*',
  ],
}