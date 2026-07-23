import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [
  "index.html",
  "en.html",
  "export.html",
  "export-tr.html",
  "bornova-agrega/index.html",
  "bornova-aggregate/index.html",
  "izmir-agrega/index.html",
  "izmir-aggregate/index.html",
  "izmir-dolgu-malzemesi/index.html",
  "izmir-fill-material/index.html",
  "izmir-kirmatas/index.html",
  "izmir-crushed-stone/index.html",
  "izmir-micir/index.html",
  "izmir-road-sub-base/index.html",
  "izmir-stone-chippings/index.html",
  "izmir-tas-ocagi/index.html",
  "izmir-quarry/index.html",
  "izmir-yol-alt-temel-malzemesi/index.html",
  "urla-crushed-stone/index.html",
  "urla-micir/index.html",
];

function contentSecurityPolicy() {
  const config = JSON.parse(readFileSync(resolve(projectRoot, "vercel.json"), "utf8"));
  const globalHeaders = config.headers.find(({ source }) => source === "/(.*)");
  const header = globalHeaders?.headers.find(({ key }) => key.toLowerCase() === "content-security-policy");
  assert.ok(header?.value, "The global Content-Security-Policy header is missing");
  return header.value;
}

function directives(policy) {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name, values];
      }),
  );
}

function inlineScriptHashes() {
  const hashes = new Set();

  for (const file of htmlFiles) {
    const html = readFileSync(resolve(projectRoot, file), "utf8");
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${file} contains an inline event handler`);

    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const [, attributes, source] = match;
      if (/\bsrc\s*=/i.test(attributes)) continue;

      assert.match(
        attributes,
        /\btype\s*=\s*["']application\/ld\+json["']/i,
        `${file} contains an unexpected inline script`,
      );
      hashes.add(`sha256-${createHash("sha256").update(source, "utf8").digest("base64")}`);
    }
  }

  return [...hashes].sort();
}

test("CSP is strict and allows only the resources used by the site", () => {
  const policy = directives(contentSecurityPolicy());

  assert.deepEqual(policy.get("default-src"), ["'self'"]);
  assert.deepEqual(policy.get("base-uri"), ["'self'"]);
  assert.deepEqual(policy.get("object-src"), ["'none'"]);
  assert.deepEqual(policy.get("frame-ancestors"), ["'self'"]);
  assert.deepEqual(policy.get("form-action"), ["'self'"]);
  assert.deepEqual(policy.get("style-src"), ["'self'"]);
  assert.deepEqual(policy.get("style-src-attr"), ["'unsafe-inline'"]);
  assert.ok(policy.has("upgrade-insecure-requests"));

  const scripts = policy.get("script-src");
  assert.ok(scripts.includes("'self'"));
  assert.ok(scripts.includes("https://www.googletagmanager.com"));
  assert.ok(scripts.includes("https://challenges.cloudflare.com"));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(!scripts.includes("'unsafe-eval'"));

  const connections = policy.get("connect-src");
  for (const source of [
    "'self'",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://challenges.cloudflare.com",
  ]) {
    assert.ok(connections.includes(source), `connect-src is missing ${source}`);
  }

  assert.deepEqual(policy.get("frame-src"), [
    "https://www.google.com",
    "https://challenges.cloudflare.com",
  ]);
});

test("CSP hashes match every inline JSON-LD block", () => {
  const scripts = directives(contentSecurityPolicy()).get("script-src");
  const configured = scripts
    .filter((source) => source.startsWith("'sha256-"))
    .map((source) => source.slice(1, -1))
    .sort();

  assert.equal(htmlFiles.length, 20);
  assert.deepEqual(configured, inlineScriptHashes());
});
