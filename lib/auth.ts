import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Client für die Verifikation von Bearer-Tokens (Mobile-App). Kein Cookie-Handling nötig.
const supabaseAnon = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Liefert den eingeloggten Nutzer für Web (Cookie-Session) UND Mobile (Bearer-Token).
export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    const { data, error } = await supabaseAnon.auth.getUser(token)
    if (error) return null
    return data.user
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
