import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const upstash =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv({ retry: { retries: 1 } }), // schnell aufgeben, falls Upstash weg ist
        limiter: Ratelimit.slidingWindow(10, "10 s"), // Max 10 Requests pro 10 Sekunden
        analytics: true,
        prefix: "@upstash/ratelimit",
      })
    : null

// Fail-open: Ist Upstash nicht konfiguriert oder nicht erreichbar, wird die Anfrage
// durchgelassen statt die ganze App lahmzulegen. Fehler werden geloggt.
export const ratelimit = {
  async limit(identifier: string): Promise<{ success: boolean }> {
    if (!upstash) {
      console.warn("⚠️ Rate-Limiting deaktiviert: UPSTASH_REDIS_REST_URL/TOKEN fehlen")
      return { success: true }
    }
    try {
      return await upstash.limit(identifier)
    } catch (error) {
      console.error("⚠️ Rate-Limiting nicht verfügbar, Anfrage wird durchgelassen:", error)
      return { success: true }
    }
  },
}
