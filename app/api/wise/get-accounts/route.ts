import { NextResponse } from 'next/server'

export async function GET() {
  const response = await fetch('https://api.wise.com/v1/accounts', {
    headers: {
      'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`
    }
  })
  const accounts = await response.json()
  // Die Antwort zeigt alle deine Konten mit ihren 'id'-Feldern
  return NextResponse.json({ accounts })
}