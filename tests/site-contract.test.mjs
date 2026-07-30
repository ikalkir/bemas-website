import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const scriptFiles = htmlFiles.filter((file) => !file.startsWith("export"));
const redesignVersion = "20260730-liquid-glass-1";

function html(file) {
  return readFileSync(resolve(projectRoot, file), "utf8");
}

function attribute(source, name) {
  return source.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function tags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map(([tag]) => tag);
}

test("all 20 routes load the same versioned Liquid Glass stylesheet", () => {
  assert.equal(htmlFiles.length, 20);
  assert.ok(existsSync(resolve(projectRoot, "liquid-glass.css")));

  for (const file of htmlFiles) {
    const links = tags(html(file), "link").filter((tag) => attribute(tag, "href").includes("liquid-glass.css"));
    assert.equal(links.length, 1, `${file} must load liquid-glass.css exactly once`);
    assert.match(
      attribute(links[0], "href"),
      new RegExp(`^/?liquid-glass\\.css\\?v=${redesignVersion}$`),
      `${file} has an unexpected Liquid Glass version`,
    );
  }
});

test("interactive routes load the matching script version", () => {
  for (const file of scriptFiles) {
    const scripts = tags(html(file), "script").filter((tag) => attribute(tag, "src").includes("script.js"));
    assert.equal(scripts.length, 1, `${file} must load script.js exactly once`);
    assert.match(
      attribute(scripts[0], "src"),
      new RegExp(`^/?script\\.js\\?v=${redesignVersion}$`),
      `${file} has an unexpected script version`,
    );
  }
});

test("homepage quote consoles use API-compatible products and distinct status hooks", () => {
  const allowedProducts = new Set([
    "crushed-stone",
    "stone-dust",
    "stabilized-aggregate",
    "fill-material",
    "riprap-stone",
    "other-aggregate",
  ]);

  for (const file of ["index.html", "en.html"]) {
    const source = html(file);
    const consoleSource = source.match(/<div class="hero-console"[\s\S]*?<\/section>/)?.[0] || "";
    assert.ok(consoleSource, `${file} is missing its quote console`);
    assert.equal((consoleSource.match(/\bdata-quote-console\b/g) || []).length, 1);
    assert.equal((consoleSource.match(/\bdata-quote-status\b/g) || []).length, 1);
    assert.equal((consoleSource.match(/\bdata-form-status\b/g) || []).length, 0);
    assert.equal((consoleSource.match(/\bdata-quote-apply\b/g) || []).length, 1);

    const products = [...consoleSource.matchAll(/\bdata-quote-product=["']([^"']+)["']/g)].map((match) => match[1]);
    assert.equal(products.length, 6);
    products.forEach((product) => assert.ok(allowedProducts.has(product), `${file} contains unsupported product ${product}`));

    assert.equal((source.match(/\bdata-contact-form\b/g) || []).length, 1);
    assert.equal((source.match(/\bdata-form-status\b/g) || []).length, 1);
    assert.equal((source.match(/\bdata-turnstile-container\b/g) || []).length, 1);
  }
});

test("page metadata, sitemap entries and language alternates remain complete", () => {
  const sitemap = readFileSync(resolve(projectRoot, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  const canonicals = new Set();

  for (const file of htmlFiles) {
    const source = html(file);
    const title = source.match(/<title>([^<]+)<\/title>/i)?.[1].trim() || "";
    const descriptionTag = tags(source, "meta").find((tag) => attribute(tag, "name").toLowerCase() === "description");
    const canonicalTag = tags(source, "link").find((tag) => attribute(tag, "rel").toLowerCase() === "canonical");
    const canonical = attribute(canonicalTag || "", "href");
    const ogUrlTag = tags(source, "meta").find((tag) => attribute(tag, "property").toLowerCase() === "og:url");
    const ogUrl = attribute(ogUrlTag || "", "content");
    const h1Count = (source.match(/<h1\b/gi) || []).length;
    const alternates = tags(source, "link").filter((tag) => attribute(tag, "rel").toLowerCase() === "alternate");
    const languages = new Set(alternates.map((tag) => attribute(tag, "hreflang").toLowerCase()));

    assert.ok(title, `${file} is missing a title`);
    assert.ok(attribute(descriptionTag || "", "content"), `${file} is missing a description`);
    assert.equal(h1Count, 1, `${file} must contain exactly one h1`);
    assert.ok(canonical, `${file} is missing its canonical URL`);
    assert.equal(ogUrl, canonical, `${file} og:url must match its canonical URL`);
    assert.ok(sitemapUrls.has(canonical), `${file} canonical URL is missing from sitemap.xml`);
    assert.deepEqual(languages, new Set(["tr", "en", "x-default"]), `${file} has incomplete language alternates`);
    assert.ok(!canonicals.has(canonical), `${file} repeats canonical URL ${canonical}`);
    canonicals.add(canonical);
  }

  assert.equal(canonicals.size, 20);
  assert.equal(sitemapUrls.size, 20);
});

test("images keep intrinsic dimensions and accessible alternative text", () => {
  for (const file of htmlFiles) {
    for (const image of tags(html(file), "img")) {
      assert.ok(/\balt=["'][^"']*["']/i.test(image), `${file} contains an image without alt`);
      assert.match(attribute(image, "width"), /^\d+$/, `${file} contains an image without numeric width`);
      assert.match(attribute(image, "height"), /^\d+$/, `${file} contains an image without numeric height`);
    }
  }
});

test("redesign assets have immutable cache headers and no fake inline artwork", () => {
  const config = JSON.parse(readFileSync(resolve(projectRoot, "vercel.json"), "utf8"));
  const stylesheetHeaders = config.headers.find(({ source }) => source === "/liquid-glass.css")?.headers || [];
  const cacheControl = stylesheetHeaders.find(({ key }) => key.toLowerCase() === "cache-control")?.value || "";
  assert.equal(cacheControl, "public, max-age=31536000, immutable");

  for (const file of htmlFiles) {
    const source = html(file);
    assert.doesNotMatch(source, /<svg\b/i, `${file} contains handcrafted inline SVG`);
    assert.doesNotMatch(source, /[🏭⚓🚢]/u, `${file} contains emoji artwork`);
  }
});

test("localized page pairs keep section parity", () => {
  const pairs = [
    ["index.html", "en.html"],
    ["export-tr.html", "export.html"],
    ["bornova-agrega/index.html", "bornova-aggregate/index.html"],
    ["izmir-agrega/index.html", "izmir-aggregate/index.html"],
    ["izmir-dolgu-malzemesi/index.html", "izmir-fill-material/index.html"],
    ["izmir-kirmatas/index.html", "izmir-crushed-stone/index.html"],
    ["izmir-micir/index.html", "izmir-stone-chippings/index.html"],
    ["izmir-yol-alt-temel-malzemesi/index.html", "izmir-road-sub-base/index.html"],
    ["izmir-tas-ocagi/index.html", "izmir-quarry/index.html"],
    ["urla-micir/index.html", "urla-crushed-stone/index.html"],
  ];

  assert.equal(pairs.flat().length, htmlFiles.length);
  assert.deepEqual(new Set(pairs.flat()), new Set(htmlFiles));

  for (const [trFile, enFile] of pairs) {
    assert.equal(
      tags(html(trFile), "section").length,
      tags(html(enFile), "section").length,
      `${trFile} and ${enFile} must keep section parity`,
    );
  }
});

test("export routes keep a semantic page shell", () => {
  for (const file of ["export.html", "export-tr.html"]) {
    const source = html(file);
    const counts = Object.fromEntries(
      ["header", "nav", "main", "footer"].map((tagName) => [tagName, tags(source, tagName).length]),
    );

    assert.deepEqual(counts, { header: 1, nav: 1, main: 1, footer: 1 });
    assert.ok(source.indexOf("<header>") < source.indexOf("<main>"), `${file} must place header before main`);
    assert.ok(source.indexOf("<main>") < source.indexOf("<footer>"), `${file} must place footer after main`);
    assert.match(source, /<main>[\s\S]*?<section class="export-hero">[\s\S]*?<\/main>/);
    assert.match(source, /<footer>[\s\S]*?<section class="section export-cta">[\s\S]*?<\/footer>/);
  }
});

test("global security headers keep COOP isolation", () => {
  const config = JSON.parse(readFileSync(resolve(projectRoot, "vercel.json"), "utf8"));
  const globalHeaders = config.headers.find(({ source }) => source === "/(.*)")?.headers || [];
  const coopValues = globalHeaders
    .filter(({ key }) => key.toLowerCase() === "cross-origin-opener-policy")
    .map(({ value }) => value);

  assert.deepEqual(coopValues, ["same-origin"]);
});
