import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safeNext } from '@/lib/safe-next'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext(requestUrl.searchParams.get('next'))}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
