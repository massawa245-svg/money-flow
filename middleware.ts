import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
   const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  console.log(`[Middleware] ${pathname} - User: ${user?.email || 'nicht eingeloggt'}`)

  // ÖFFENTLICHE ROUTEN (KEIN LOGIN NÖTIG)
  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/auth/callback' ||
    pathname === '/api/test' ||  // API-Routen erlauben
    pathname.startsWith('/api/')  // ALLE API-Routen erlauben

  // GESCHÜTZTE ROUTEN (LOGIN NÖTIG)
  const isProtectedPage = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/transfer') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/add-money') ||
    pathname.startsWith('/withdraw') ||
    pathname.startsWith('/receive')

  // ❌ Nicht eingeloggt + geschützte Seite → redirect
  if (!user && isProtectedPage) {
    console.log(`[Middleware] 🔒 Nicht eingeloggt auf ${pathname} -> /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ✅ Eingeloggt + Login-Seite → redirect
  if (user && pathname === '/login') {
    console.log(`[Middleware] ✅ Eingeloggt auf /login -> /dashboard`)
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/auth/callback',
    '/api/:path*',  // API-Routen im matcher!
  ],
}