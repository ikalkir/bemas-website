import assert from "node:assert/strict";
import test from "node:test";
import handler, { __test } from "../api/contact.mjs";

const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  CONTACT_ALLOWED_PREVIEW_HOSTS: process.env.CONTACT_ALLOWED_PREVIEW_HOSTS,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
};
const originalFetch = globalThis.fetch;

function request(overrides = {}) {
  return {
    method: "POST",
    body: {
      name: "Bemaş Test",
      phone: "+90 232 360 10 85",
      email: "customer@example.com",
      product: "crushed-stone",
      message: "<script>alert('x')</script> 500 ton",
      language: "tr",
      website: "",
      requestId: "contact-test-12345",
      turnstileToken: "turnstile-test-token-12345",
    },
    headers: {
      origin: "https://bemasagrega.com",
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.10",
    },
    ...overrides,
  };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

function installProviderMock({ turnstile = {}, resendStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/turnstile/v0/siteverify")) {
      return new Response(
        JSON.stringify({
          success: true,
          action: "contact",
          hostname: "bemasagrega.com",
          ...turnstile,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (String(url) === "https://api.resend.com/emails") {
      return new Response(JSON.stringify(resendStatus === 200 ? { id: "email_123" } : { name: "provider_error" }), {
        status: resendStatus,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return calls;
}

test.beforeEach(() => {
  __test.resetRateLimits();
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.CONTACT_FROM_EMAIL = "Bemaş Website <website@send.bemasmining.com>";
  process.env.CONTACT_TO_EMAIL = "info@bemasmining.com";
  process.env.TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.VERCEL_ENV = "production";
  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_BRANCH_URL;
  delete process.env.CONTACT_ALLOWED_PREVIEW_HOSTS;
});

test.after(() => {
  globalThis.fetch = originalFetch;
  Object.entries(originalEnvironment).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

test("returns the public Turnstile site key without exposing the secret", async () => {
  const res = response();
  await handler(request({ method: "GET" }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { ok: true, siteKey: "1x00000000000000000000AA" });
  assert.doesNotMatch(JSON.stringify(res.payload), /0000000000000000000000000AA/);
});

test("rejects methods other than GET and POST", async () => {
  const res = response();
  await handler(request({ method: "PUT" }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET, POST, OPTIONS");
  assert.equal(res.payload.code, "METHOD_NOT_ALLOWED");
});

test("rejects an untrusted browser origin", async () => {
  const res = response();
  await handler(request({ headers: { origin: "https://attacker.example", "x-forwarded-for": "192.0.2.11" } }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, "ORIGIN_NOT_ALLOWED");
});

test("returns field errors without calling the provider", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  const res = response();
  await handler(request({ body: { ...request().body, email: "invalid" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "VALIDATION_ERROR");
  assert.equal(res.payload.fields.email, "invalid");
  assert.equal(called, false);
});

test("silently accepts honeypot submissions without sending email", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  const res = response();
  await handler(request({ body: { ...request().body, website: "https://spam.example" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(called, false);
});

test("sends a sanitized, idempotent Resend request", async () => {
  const calls = installProviderMock();
  const res = response();
  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  const verificationRequest = calls.find((call) => call.url.includes("/turnstile/v0/siteverify"));
  assert.ok(verificationRequest);
  assert.equal(verificationRequest.options.body.get("response"), "turnstile-test-token-12345");
  assert.equal(verificationRequest.options.body.get("remoteip"), "192.0.2.10");
  const providerRequest = calls.find((call) => call.url === "https://api.resend.com/emails");
  assert.ok(providerRequest);
  assert.equal(providerRequest.url, "https://api.resend.com/emails");
  assert.equal(providerRequest.options.headers["Idempotency-Key"], "bemas-contact-contact-test-12345");
  const providerBody = JSON.parse(providerRequest.options.body);
  assert.deepEqual(providerBody.to, ["info@bemasmining.com"]);
  assert.equal(providerBody.reply_to, "customer@example.com");
  assert.match(providerBody.text, /<script>alert\('x'\)<\/script>/);
  assert.doesNotMatch(providerBody.html, /<script>/);
  assert.match(providerBody.html, /&lt;script&gt;/);
});

test("rate limits repeated submissions from the same address", async () => {
  installProviderMock();
  for (let index = 0; index < 5; index += 1) {
    const res = response();
    await handler(request({ body: { ...request().body, requestId: `rate-limit-test-${index}` } }), res);
    assert.equal(res.statusCode, 200);
  }

  const limited = response();
  await handler(request({ body: { ...request().body, requestId: "rate-limit-test-last" } }), limited);
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.payload.code, "RATE_LIMITED");
  assert.ok(Number(limited.headers["retry-after"]) > 0);
});

test("fails closed when mail configuration is missing", async () => {
  delete process.env.RESEND_API_KEY;
  const calls = installProviderMock();
  const res = response();
  await handler(request({ headers: { ...request().headers, "x-forwarded-for": "192.0.2.30" } }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.code, "MAIL_NOT_CONFIGURED");
  assert.equal(calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
});

test("rejects a null JSON payload without throwing or calling providers", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  const res = response();
  await handler(request({ body: null }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "VALIDATION_ERROR");
  assert.equal(called, false);
});

test("enforces the body limit for pre-parsed objects without Content-Length", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  const res = response();
  await handler(request({ body: { ...request().body, message: "x".repeat(20_000) } }), res);
  assert.equal(res.statusCode, 413);
  assert.equal(res.payload.code, "REQUEST_TOO_LARGE");
  assert.equal(called, false);
});

test("fails closed when Turnstile configuration is missing", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  const res = response();
  await handler(request({ headers: { ...request().headers, "x-forwarded-for": "192.0.2.31" } }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.code, "VERIFICATION_NOT_CONFIGURED");
  assert.equal(called, false);
});

test("rejects failed, wrong-action, or wrong-host Turnstile results before email delivery", async () => {
  const calls = installProviderMock({
    turnstile: { success: true, action: "login", hostname: "attacker.example" },
  });
  const res = response();
  await handler(request({ headers: { ...request().headers, "x-forwarded-for": "192.0.2.32" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "VERIFICATION_FAILED");
  assert.equal(calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
});

test("simulates success without sending email for Cloudflare's public test secret outside production", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "bemas-preview.example.vercel.app";
  const calls = installProviderMock({
    turnstile: { success: true, action: undefined, hostname: undefined },
  });
  const res = response();
  await handler(
    request({
      headers: {
        ...request().headers,
        origin: "https://bemas-preview.example.vercel.app",
        "x-forwarded-for": "192.0.2.33",
      },
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.testMode, true);
  assert.equal(calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
});

test("accepts Vercel branch and explicit preview aliases as non-production origins", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_BRANCH_URL = "bemas-main-preview.example.vercel.app";
  process.env.CONTACT_ALLOWED_PREVIEW_HOSTS = "preview.bemasagrega.com";
  const calls = installProviderMock({
    turnstile: { success: true, action: undefined, hostname: undefined },
  });

  for (const [index, origin] of [
    "https://bemas-main-preview.example.vercel.app",
    "https://preview.bemasagrega.com",
  ].entries()) {
    const res = response();
    await handler(
      request({
        headers: { ...request().headers, origin, "x-forwarded-for": `192.0.2.${40 + index}` },
        body: { ...request().body, requestId: `preview-alias-test-${index}` },
      }),
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.testMode, true);
  }
  assert.equal(calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
});
