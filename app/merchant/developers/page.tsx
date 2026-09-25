import { headers } from "next/headers"
import { CodeBlock } from "@/components/CodeBlock"
import { curlCreateCheckout, curlGetCheckout, VERIFY_NODE, VERIFY_PHP, VERIFY_PYTHON } from "@/lib/dev-snippets"
import DevelopersClient from "./DevelopersClient"

// Server-Teil: färbt die Code-Beispiele ein (Shiki) und reicht sie an die interaktive Seite weiter
export default async function DevelopersPage() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  const origin = `${proto}://${host}`

  return (
    <DevelopersClient
      snippets={{
        createCheckout: <CodeBlock code={curlCreateCheckout(origin)} lang="bash" />,
        getCheckout: <CodeBlock code={curlGetCheckout(origin)} lang="bash" />,
        verify: {
          node: <CodeBlock code={VERIFY_NODE} lang="javascript" />,
          php: <CodeBlock code={VERIFY_PHP} lang="php" />,
          python: <CodeBlock code={VERIFY_PYTHON} lang="python" />,
        },
      }}
    />
  )
}
