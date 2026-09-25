import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // Max 10 Requests pro 10 Sekunden
  analytics: true,
  prefix: "@upstash/ratelimit",
})