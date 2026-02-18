const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fwwbivqdvujmigwnumnr.supabase.co'
const supabaseKey = 'sb_publishable_5J-oiyo5j0j46FlkyKi6jQ_c5MUcMWK'

console.log(' Teste Supabase Verbindung...')
console.log('URL:', supabaseUrl)
console.log('Key vorhanden:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // Versuche einen User zu finden (öffentlicher Test)
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.log('❌ Supabase FEHLER:', error.message)
  } else {
    console.log(' Supabase Verbindung OK!')
    console.log('Session:', data)
  }
}

test()
