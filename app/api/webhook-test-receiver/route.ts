import { NextResponse } from 'next/server'

// Eingebauter Test-Empfänger für Webhooks: nimmt jedes Event an und antwortet mit 200.
// So können Händler Webhooks ausprobieren, ohne einen eigenen Server oder fremden Dienst.
// Speichert nichts – den Inhalt sieht der Händler im Zustell-Protokoll.
export async function POST(request: Request) {
  const body = await request.text()
  return NextResponse.json({
    received: true,
    bytes: body.length,
    signature_present: request.headers.has('X-Webhook-Signature')
  })
}
