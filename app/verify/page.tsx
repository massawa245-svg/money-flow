"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Icon } from "@/components/Icon"

const BUCKET = "kyc-documents"
const MAX_BYTES = 10 * 1024 * 1024

type Kyc = {
  kycStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  firstName: string | null
  lastName: string | null
  dateOfBirth: string | null
  street: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  kycRejectReason: string | null
}

type DocKey = "idFront" | "idBack" | "selfie"

const DOCS: { key: DocKey; label: string; hint: string; capture?: "user" | "environment" }[] = [
  { key: "idFront", label: "Ausweis – Vorderseite", hint: "Alle Ecken sichtbar, gut lesbar", capture: "environment" },
  { key: "idBack", label: "Ausweis – Rückseite", hint: "Alle Ecken sichtbar, gut lesbar", capture: "environment" },
  { key: "selfie", label: "Selfie", hint: "Gesicht gut beleuchtet, ohne Brille/Mütze", capture: "user" },
]

const FIELDS: { key: keyof Kyc; label: string; type?: string; placeholder?: string; autoComplete?: string }[] = [
  { key: "firstName", label: "Vorname", autoComplete: "given-name" },
  { key: "lastName", label: "Nachname", autoComplete: "family-name" },
  { key: "dateOfBirth", label: "Geburtsdatum", type: "date", autoComplete: "bday" },
  { key: "street", label: "Straße und Hausnummer", autoComplete: "street-address" },
  { key: "postalCode", label: "PLZ", autoComplete: "postal-code" },
  { key: "city", label: "Ort", autoComplete: "address-level2" },
  { key: "country", label: "Land", placeholder: "z. B. Deutschland", autoComplete: "country-name" },
]

export default function VerifyPage() {
  const router = useRouter()
  const [kyc, setKyc] = useState<Kyc | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/kyc", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) return router.push("/login?next=/verify")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setKyc(data.kyc)
        const prefill: Record<string, string> = {}
        FIELDS.forEach((f) => { if (data.kyc[f.key]) prefill[f.key] = data.kyc[f.key] })
        setForm(prefill)
      })
      .catch((e) => setError(e.message || "Status konnte nicht geladen werden"))
  }, [router])

  const pickFile = (key: DocKey, file: File | undefined) => {
    setError("")
    if (!file) return
    if (!file.type.startsWith("image/")) return setError("Bitte ein Foto (JPG oder PNG) auswählen")
    if (file.size > MAX_BYTES) return setError("Das Foto ist größer als 10 MB")
    setFiles((current) => ({ ...current, [key]: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (DOCS.some((d) => !files[d.key])) return setError("Bitte beide Ausweisseiten und ein Selfie hochladen")

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Bitte erneut anmelden")

      // Fotos in den privaten Ordner des Nutzers hochladen; lesen können sie nur Prüfer
      const paths: Partial<Record<DocKey, string>> = {}
      for (const doc of DOCS) {
        const file = files[doc.key]!
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
        const path = `${user.id}/${doc.key}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
        if (uploadError) throw new Error(`Hochladen fehlgeschlagen (${doc.label}): ${uploadError.message}`)
        paths[doc.key] = path
      }

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, idFrontPath: paths.idFront, idBackPath: paths.idBack, selfiePath: paths.selfie }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Einreichen fehlgeschlagen")
      setKyc(data.kyc)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!kyc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error ? <p className="text-red-600">{error}</p> : <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 inline-block mb-6">
          ← Zurück zur Übersicht
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Icon name="shield" className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold">Identität bestätigen</h1>
          </div>

          {kyc.kycStatus === "APPROVED" && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
              <Icon name="check" className="w-5 h-5" /> Dein Konto ist verifiziert. Du kannst alle Funktionen nutzen.
            </div>
          )}

          {kyc.kycStatus === "PENDING" && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <p className="font-semibold flex items-center gap-2"><Icon name="clock" className="w-5 h-5" /> Wird geprüft</p>
              <p className="text-sm mt-1">Wir prüfen deine Angaben. Sobald dein Konto freigeschaltet ist, kannst du Geld senden, bezahlen, ein- und auszahlen.</p>
            </div>
          )}

          {(kyc.kycStatus === "NONE" || kyc.kycStatus === "REJECTED") && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {kyc.kycStatus === "REJECTED" ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                  <p className="font-semibold">Prüfung abgelehnt</p>
                  <p className="text-sm mt-1">{kyc.kycRejectReason || "Bitte reiche deine Angaben erneut ein."}</p>
                </div>
              ) : (
                <p className="text-gray-600">
                  Bevor du Geld senden oder bezahlen kannst, müssen wir deine Identität prüfen. Das ist gesetzlich vorgeschrieben.
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.key === "street" ? "sm:col-span-2" : ""}`}>
                    <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
                    <input
                      type={f.type || "text"}
                      value={form[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      autoComplete={f.autoComplete}
                      maxLength={100}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {DOCS.map((doc) => (
                  <label
                    key={doc.key}
                    className={`flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition ${
                      files[doc.key] ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    <Icon name={files[doc.key] ? "check" : doc.key === "selfie" ? "user" : "camera"} className="w-7 h-7 text-gray-600" />
                    <span className="font-medium text-sm">{doc.label}</span>
                    <span className="text-xs text-gray-500">{files[doc.key] ? files[doc.key]!.name : doc.hint}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture={doc.capture}
                      className="hidden"
                      onChange={(e) => pickFile(doc.key, e.target.files?.[0])}
                    />
                  </label>
                ))}
              </div>

              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <Icon name="lock" className="w-4 h-4 shrink-0 mt-0.5" />
                Deine Fotos werden verschlüsselt gespeichert und nur von unserem Prüfteam angesehen.
              </p>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? "Wird hochgeladen..." : "Zur Prüfung einreichen"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
