// Code-Beispiele für die Entwickler-Seite. Die Signatur-Prüfungen sind gegen
// lib/webhooks.ts signPayload() getestet (Node.js, PHP 8.5 und Python ausgeführt).

export function curlCreateCheckout(origin: string) {
  return `curl -X POST ${origin}/api/v1/checkout \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: bestellung-1001" \\
  -d '{
    "amount": 25.50,
    "reference": "Bestellung #1001",
    "success_url": "https://dein-shop.de/danke",
    "cancel_url": "https://dein-shop.de/warenkorb"
  }'`
}

export function curlGetCheckout(origin: string) {
  return `curl ${origin}/api/v1/checkout/CHECKOUT_ID \\
  -H "Authorization: Bearer sk_test_..."`
}

export const VERIFY_NODE = `const crypto = require("crypto")

// rawBody = unveränderter Request-Body als String
function verifyWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")))
  const expected = crypto
    .createHmac("sha256", secret)
    .update(parts.t + "." + rawBody)
    .digest("hex")
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300 // max. 5 Minuten alt
  const given = Buffer.from(parts.v1 || "")
  return fresh && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), given)
}

// Header: X-Webhook-Signature`

export const VERIFY_PHP = `<?php
// $rawBody = unveränderter Request-Body, z.B. file_get_contents('php://input')
function verifyWebhook(string $rawBody, string $signatureHeader, string $secret): bool {
    $parts = [];
    foreach (explode(',', $signatureHeader) as $part) {
        [$key, $value] = array_pad(explode('=', $part, 2), 2, '');
        $parts[$key] = $value;
    }
    $timestamp = $parts['t'] ?? '';
    if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) { // max. 5 Minuten alt
        return false;
    }
    $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    return hash_equals($expected, $parts['v1'] ?? '');
}

// Header: $_SERVER['HTTP_X_WEBHOOK_SIGNATURE']`

export const VERIFY_PYTHON = `import hashlib
import hmac
import time


# raw_body = unveränderter Request-Body als Bytes (z.B. request.body in Django, request.get_data() in Flask)
def verify_webhook(raw_body: bytes, signature_header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in signature_header.split(",") if "=" in p)
    timestamp, given = parts.get("t", ""), parts.get("v1", "")
    if not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:  # max. 5 Minuten alt
        return False
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, given)


# Header: X-Webhook-Signature`
