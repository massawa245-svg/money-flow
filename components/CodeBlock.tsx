import { codeToHtml } from 'shiki'

// Syntax-Highlighting wie in VS Code (Theme "Dark+"). Läuft nur auf dem Server,
// Shiki landet also nicht im Browser-Bundle.
export async function CodeBlock({ code, lang }: { code: string; lang: 'bash' | 'javascript' | 'php' | 'python' | 'json' }) {
  const html = await codeToHtml(code, { lang, theme: 'dark-plus' })
  return (
    <div
      className="code-block text-xs rounded-lg overflow-x-auto [&_pre]:p-4 [&_pre]:min-w-max"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
