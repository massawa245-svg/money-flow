// Kleiner JSON-Einfärber mit den VS-Code-Farben (Dark+), für Inhalte, die erst im Browser
// bekannt sind (z.B. Webhook-Events im Zustell-Protokoll)
const COLORS = {
  key: '#9CDCFE',
  string: '#CE9178',
  number: '#B5CEA8',
  literal: '#569CD6',
  punctuation: '#D4D4D4',
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g

export function JsonView({ json }: { json: string }) {
  let pretty = json
  try {
    pretty = JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    // kein gültiges JSON: unverändert anzeigen
  }

  const parts: React.ReactNode[] = []
  let last = 0
  for (const match of pretty.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) parts.push(pretty.slice(last, index))
    const [text, str, colon, num, literal] = match
    const color = str ? (colon ? COLORS.key : COLORS.string) : num ? COLORS.number : literal ? COLORS.literal : COLORS.punctuation
    if (str && colon) {
      parts.push(<span key={index} style={{ color }}>{str}</span>, <span key={`${index}:`} style={{ color: COLORS.punctuation }}>{colon}</span>)
    } else {
      parts.push(<span key={index} style={{ color }}>{text}</span>)
    }
    last = index + text.length
  }
  if (last < pretty.length) parts.push(pretty.slice(last))

  return (
    <pre className="text-xs rounded-lg p-4 overflow-x-auto" style={{ backgroundColor: '#1E1E1E', color: COLORS.punctuation }}>
      {parts}
    </pre>
  )
}
