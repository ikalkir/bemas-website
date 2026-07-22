const MAX_BODY_BYTES = 12_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const CLOUDFLARE_ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";
const rateLimitBuckets = new Map();

import { randomUUID } from "node:crypto";

const allowedProducts = new Set([
  "crushed-stone",
  "stone-dust",
  "stabilized-aggregate",
  "fill-material",
  "riprap-stone",
  "other-aggregate",
]);

const productLabels = {
  tr: {
    "crushed-stone": "Mıcır",
    "stone-dust": "Mıcır Tozu",
    "stabilized-aggregate": "Stabilize",
    "fill-material": "Dolgu Malzemesi",
    "riprap-stone": "Anroşman Taşı",
    "other-aggregate": "Diğer agrega talebi",
  },
  en: {
    "crushed-stone": "Crushed Stone",
    "stone-dust": "Stone Dust",
    "stabilized-aggregate": "Stabilized Aggregate",
    "fill-material": "Fill Material",
    "riprap-stone": "Riprap Stone",
    "other-aggregate": "Other aggregate request",
  },
};

function getHeader(request, name) {
  if (typeof request.headers?.get === "function") {
    return request.headers.get(name) || "";
  }

  const normalizedName = name.toLowerCase();
  return String(request.headers?.[normalizedName] || request.headers?.[name] || "");
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.status(status);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(extraHeaders).forEach(([name, value]) => response.setHeader(name, value));
  return response.json(payload);
}

async function readRequestBody(request) {
  if (request.body !== null && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    if (Array.isArray(request.body)) {
      throw new Error("INVALID_BODY");
    }

    let serializedBody;
    try {
      serializedBody = JSON.stringify(request.body);
    } catch {
      throw new Error("INVALID_BODY");
    }
    if (Buffer.byteLength(serializedBody) > MAX_BODY_BYTES) {
      throw new Error("BODY_TOO_LARGE");
    }

    return request.body;
  }

  let rawBody = Buffer.isBuffer(request.body)
    ? request.body.toString("utf8")
    : typeof request.body === "string"
      ? request.body
      : "";
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    throw new Error("BODY_TOO_LARGE");
  }
  if (!rawBody && request?.[Symbol.asyncIterator]) {
    for await (const chunk of request) {
      rawBody += chunk;
      if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
        throw new Error("BODY_TOO_LARGE");
      }
    }
  }

  if (!rawBody) {
    return {};
  }

  const contentType = getHeader(request, "content-type").toLowerCase();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function normalizeSingleLine(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength + 1);
}

function normalizeMessage(value, maxLength) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength + 1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(payload) {
  const values = {
    name: normalizeSingleLine(payload.name, 120),
    phone: normalizeSingleLine(payload.phone, 40),
    email: normalizeSingleLine(payload.email, 254).toLowerCase(),
    product: normalizeSingleLine(payload.product, 80),
    message: normalizeMessage(payload.message, 2_000),
    language: payload.language === "en" ? "en" : "tr",
    website: normalizeSingleLine(payload.website, 200),
    requestId: normalizeSingleLine(payload.requestId, 80) || randomUUID(),
    turnstileToken: normalizeSingleLine(payload.turnstileToken || payload["cf-turnstile-response"], 4_096),
  };
  const fields = {};

  if (values.name.length < 2 || values.name.length > 120) fields.name = "invalid";
  if (!/^[0-9+().\s-]{5,40}$/.test(values.phone)) fields.phone = "invalid";
  if (!isEmail(values.email)) fields.email = "invalid";
  if (!allowedProducts.has(values.product)) fields.product = "invalid";
  if (values.message.length > 2_000) fields.message = "invalid";
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(values.requestId)) fields.requestId = "invalid";
  if (!values.turnstileToken || values.turnstileToken.length > 4_096) fields.turnstileToken = "invalid";

  return { values, fields, valid: Object.keys(fields).length === 0 };
}

function isAllowedOrigin(request) {
  const origin = getHeader(request, "origin");
  if (!origin) return true;

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const productionHosts = new Set([
    "bemasagrega.com",
    "www.bemasagrega.com",
    "bemasmining.com",
    "www.bemasmining.com",
  ]);
  if (originUrl.protocol === "https:" && productionHosts.has(originUrl.hostname)) {
    return true;
  }

  if (process.env.VERCEL_ENV !== "production") {
    const previewHosts = expectedPreviewHostnames();
    if (originUrl.protocol === "https:" && previewHosts.has(originUrl.hostname)) {
      return true;
    }

    if (originUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(originUrl.hostname)) {
      return true;
    }
  }

  return false;
}

function clientIp(request) {
  return getHeader(request, "x-forwarded-for").split(",")[0].trim() || getHeader(request, "x-real-ip").trim();
}

function normalizeHostname(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";

  try {
    return new URL(normalized.includes("://") ? normalized : `https://${normalized}`).hostname;
  } catch {
    return "";
  }
}

function expectedPreviewHostnames() {
  const hostnames = new Set();
  [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .map(normalizeHostname)
    .filter(Boolean)
    .forEach((hostname) => hostnames.add(hostname));
  String(process.env.CONTACT_ALLOWED_PREVIEW_HOSTS || "")
    .split(",")
    .map(normalizeHostname)
    .filter(Boolean)
    .slice(0, 10)
    .forEach((hostname) => hostnames.add(hostname));
  return hostnames;
}

function expectedTurnstileHostnames() {
  const hostnames = new Set([
    "bemasagrega.com",
    "www.bemasagrega.com",
    "bemasmining.com",
    "www.bemasmining.com",
  ]);

  if (process.env.VERCEL_ENV !== "production") {
    expectedPreviewHostnames().forEach((hostname) => hostnames.add(hostname));
    hostnames.add("localhost");
    hostnames.add("127.0.0.1");
  }

  return hostnames;
}

async function verifyTurnstile(token, request) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) {
    return { ok: false, configurationError: true, unavailable: false, testMode: false };
  }

  const body = new URLSearchParams({ secret, response: token });
  const ipAddress = clientIp(request);
  if (ipAddress) body.set("remoteip", ipAddress);

  let verificationResponse;
  try {
    verificationResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    console.error("contact_verification_exception", { name: String(error?.name || "Error").slice(0, 80) });
    return { ok: false, configurationError: false, unavailable: true, testMode: false };
  }

  if (!verificationResponse.ok) {
    console.error("contact_verification_provider_failed", { status: verificationResponse.status });
    return { ok: false, configurationError: false, unavailable: true, testMode: false };
  }

  let result;
  try {
    result = await verificationResponse.json();
  } catch {
    return { ok: false, configurationError: false, unavailable: true, testMode: false };
  }

  const hostname = String(result?.hostname || "").toLowerCase();
  const actionMatches = result?.action === "contact";
  const hostnameMatches = expectedTurnstileHostnames().has(hostname);
  const isOfficialNonProductionTest =
    process.env.VERCEL_ENV !== "production" && secret === CLOUDFLARE_ALWAYS_PASS_TEST_SECRET;
  if (result?.success === true && isOfficialNonProductionTest) {
    return { ok: true, configurationError: false, unavailable: false, testMode: true };
  }
  if (result?.success !== true || !actionMatches || !hostnameMatches) {
    const errorCodes = Array.isArray(result?.["error-codes"])
      ? result["error-codes"].map((code) => String(code).slice(0, 80)).slice(0, 5)
      : [];
    console.warn("contact_verification_rejected", {
      actionMatches,
      hostnameMatches,
      errorCodes,
    });
    return { ok: false, configurationError: false, unavailable: false, testMode: false };
  }

  return { ok: true, configurationError: false, unavailable: false, testMode: false };
}

function checkRateLimit(ipAddress, now = Date.now()) {
  if (!ipAddress) return { allowed: true, retryAfter: 0 };

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }

  const existing = rateLimitBuckets.get(ipAddress);
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(ipAddress, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function parseRecipients(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
}

function buildEmail(values) {
  const labels =
    values.language === "en"
      ? { title: "Website contact request", name: "Name / Company", phone: "Phone", email: "Email", product: "Product", message: "Message" }
      : { title: "Web sitesi iletişim talebi", name: "Ad Soyad / Firma", phone: "Telefon", email: "E-posta", product: "Ürün", message: "Mesaj" };
  const productLabel = productLabels[values.language][values.product];
  const text = [
    labels.title,
    "",
    `${labels.name}: ${values.name}`,
    `${labels.phone}: ${values.phone}`,
    `${labels.email}: ${values.email}`,
    `${labels.product}: ${productLabel}`,
    `${labels.message}: ${values.message || "-"}`,
  ].join("\n");
  const htmlRows = [
    [labels.name, values.name],
    [labels.phone, values.phone],
    [labels.email, values.email],
    [labels.product, productLabel],
    [labels.message, values.message || "-"],
  ]
    .map(([label, value]) => `<tr><th align="left" style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`)
    .join("");

  return {
    subject: `${labels.title}: ${productLabel} — ${values.name}`,
    text,
    html: `<h1 style="font:600 20px Arial,sans-serif">${escapeHtml(labels.title)}</h1><table style="border-collapse:collapse;font:14px Arial,sans-serif">${htmlRows}</table>`,
  };
}

async function deliverEmail(values) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.CONTACT_FROM_EMAIL || "").trim();
  const recipients = parseRecipients(process.env.CONTACT_TO_EMAIL || "info@bemasmining.com");

  if (!apiKey || !from || recipients.length === 0 || recipients.some((email) => !isEmail(email))) {
    return { ok: false, configurationError: true };
  }

  const email = buildEmail(values);
  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `bemas-contact-${values.requestId}`,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: values.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!providerResponse.ok) {
    let providerCode = "unknown";
    try {
      const providerError = await providerResponse.json();
      providerCode = String(providerError?.name || providerError?.code || "unknown").slice(0, 80);
    } catch {
      // Avoid exposing or logging provider response bodies.
    }
    console.error("contact_email_delivery_failed", { status: providerResponse.status, providerCode });
    return { ok: false, configurationError: false };
  }

  return { ok: true };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204);
    response.setHeader("Allow", "GET, POST, OPTIONS");
    response.setHeader("Cache-Control", "no-store");
    return response.end();
  }

  if (request.method === "GET") {
    const siteKey = String(process.env.TURNSTILE_SITE_KEY || "").trim();
    if (!siteKey) {
      return sendJson(response, 503, { ok: false, code: "VERIFICATION_NOT_CONFIGURED" });
    }
    return sendJson(response, 200, { ok: true, siteKey });
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED" }, { Allow: "GET, POST, OPTIONS" });
  }

  if (!isAllowedOrigin(request)) {
    return sendJson(response, 403, { ok: false, code: "ORIGIN_NOT_ALLOWED" });
  }

  const contentLength = Number(getHeader(request, "content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return sendJson(response, 413, { ok: false, code: "REQUEST_TOO_LARGE" });
  }

  let payload;
  try {
    payload = await readRequestBody(request);
  } catch (error) {
    const code = error?.message === "BODY_TOO_LARGE" ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST";
    return sendJson(response, code === "REQUEST_TOO_LARGE" ? 413 : 400, { ok: false, code });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return sendJson(response, 400, { ok: false, code: "INVALID_REQUEST" });
  }

  const validation = validatePayload(payload);
  if (validation.values.website) {
    return sendJson(response, 200, { ok: true, requestId: validation.values.requestId || null });
  }

  if (!validation.valid) {
    return sendJson(response, 400, { ok: false, code: "VALIDATION_ERROR", fields: validation.fields });
  }

  const rateLimit = checkRateLimit(clientIp(request));
  if (!rateLimit.allowed) {
    return sendJson(
      response,
      429,
      { ok: false, code: "RATE_LIMITED" },
      { "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  const verification = await verifyTurnstile(validation.values.turnstileToken, request);
  if (verification.configurationError) {
    console.error("contact_verification_not_configured");
    return sendJson(response, 503, { ok: false, code: "VERIFICATION_NOT_CONFIGURED" });
  }
  if (verification.unavailable) {
    return sendJson(response, 503, { ok: false, code: "VERIFICATION_UNAVAILABLE" });
  }
  if (!verification.ok) {
    return sendJson(response, 400, { ok: false, code: "VERIFICATION_FAILED" });
  }
  if (verification.testMode) {
    return sendJson(response, 200, { ok: true, requestId: validation.values.requestId, testMode: true });
  }

  try {
    const delivery = await deliverEmail(validation.values);
    if (delivery.configurationError) {
      console.error("contact_email_not_configured");
      return sendJson(response, 503, { ok: false, code: "MAIL_NOT_CONFIGURED" });
    }
    if (!delivery.ok) {
      return sendJson(response, 502, { ok: false, code: "MAIL_DELIVERY_FAILED" });
    }
  } catch (error) {
    console.error("contact_email_delivery_exception", { name: String(error?.name || "Error").slice(0, 80) });
    return sendJson(response, 502, { ok: false, code: "MAIL_DELIVERY_FAILED" });
  }

  return sendJson(response, 200, { ok: true, requestId: validation.values.requestId });
}

export const __test = {
  buildEmail,
  checkRateLimit,
  escapeHtml,
  resetRateLimits() {
    rateLimitBuckets.clear();
  },
  verifyTurnstile,
  validatePayload,
};
