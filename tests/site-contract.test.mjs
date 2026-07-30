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
const redesignVersion = "20260730-order-flow-2";

function html(file) {
  return readFileSync(resolve(projectRoot, file), "utf8");
}

function attribute(source, name) {
  return source.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function tags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map(([tag]) => tag);
}

function orderHelperApi() {
  const source = readFileSync(resolve(projectRoot, "script.js"), "utf8");
  const start = source.indexOf("function sanitizeQuoteText");
  const end = source.indexOf("function setupQuoteConsoles");
  assert.ok(start >= 0 && end > start, "script.js order helpers could not be isolated");
  const helperSource = source.slice(start, end);
  return Function(
    `"use strict";\n${helperSource}\nreturn { quoteWorkflowState, quoteTonnageUnit, quoteMessageWithUserText };`,
  )();
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

test("homepage order consoles enforce material, tonnage and delivery sequence", () => {
  const allowedProducts = new Set([
    "crushed-stone",
    "stone-dust",
    "stabilized-aggregate",
    "fill-material",
    "riprap-stone",
    "other-aggregate",
  ]);
  const expectedDeliveryIds = ["izmir-site", "urla-site", "alsancak-port", "aliaga-port"];
  const workflows = new Map();

  for (const file of ["index.html", "en.html"]) {
    const source = html(file);
    const consoleSource = source.match(/<div class="hero-console"[\s\S]*?<\/section>/)?.[0] || "";
    assert.ok(consoleSource, `${file} is missing its quote console`);
    assert.equal((consoleSource.match(/\bdata-quote-console\b/g) || []).length, 1);
    assert.equal((consoleSource.match(/\bdata-quote-status\b/g) || []).length, 1);
    assert.equal((consoleSource.match(/\bdata-form-status\b/g) || []).length, 0);
    assert.equal((consoleSource.match(/\bdata-quote-apply\b/g) || []).length, 1);
    assert.equal((consoleSource.match(/\bis-selected\b/g) || []).length, 0, `${file} must not preload a selection`);

    const productButtons = tags(consoleSource, "button").filter((tag) => attribute(tag, "data-quote-product"));
    const products = productButtons.map((tag) => attribute(tag, "data-quote-product"));
    assert.equal(products.length, 6);
    products.forEach((product) => assert.ok(allowedProducts.has(product), `${file} contains unsupported product ${product}`));
    productButtons.forEach((tag) => {
      assert.equal(attribute(tag, "aria-pressed"), "false", `${file} must start with unpressed material choices`);
      assert.doesNotMatch(tag, /\bdisabled(?:\s|>|=)/i, `${file} material choices must start enabled`);
    });

    const tonnageInputs = tags(consoleSource, "input").filter((tag) => /\bdata-quote-tonnage(?:\s|=|>)/i.test(tag));
    assert.equal(tonnageInputs.length, 1, `${file} must contain one tonnage input`);
    assert.equal((consoleSource.match(/\bdata-quote-tonnage-unit\b/g) || []).length, 1);
    assert.equal(attribute(tonnageInputs[0], "type"), "number");
    assert.equal(attribute(tonnageInputs[0], "min"), "1");
    assert.match(tonnageInputs[0], /\bdisabled(?:\s|>|=)/i, `${file} tonnage must start disabled`);

    const deliveryButtons = tags(consoleSource, "button").filter((tag) => attribute(tag, "data-quote-delivery"));
    const deliveryIds = deliveryButtons.map((tag) => attribute(tag, "data-quote-delivery-id"));
    assert.deepEqual(deliveryIds, expectedDeliveryIds, `${file} has unexpected delivery points`);
    deliveryButtons.forEach((tag) => {
      assert.equal(attribute(tag, "aria-pressed"), "false", `${file} must start with unpressed delivery choices`);
      assert.match(tag, /\bdisabled(?:\s|>|=)/i, `${file} delivery choices must start disabled`);
    });

    const applyButton = tags(consoleSource, "button").find((tag) => /\bdata-quote-apply(?:\s|=|>)/i.test(tag)) || "";
    assert.equal(attribute(applyButton, "type"), "button", `${file} order action must not submit before form review`);
    assert.match(applyButton, /\bdisabled(?:\s|>|=)/i, `${file} order button must start disabled`);
    const applyLabel = consoleSource.match(/<button\b[^>]*\bdata-quote-apply(?:\s|=|>)[^>]*>([^<]+)<\/button>/i)?.[1].trim() || "";
    assert.equal(applyLabel, file === "index.html" ? "Sipariş Ver" : "Place Order");

    const sequence = [
      consoleSource.indexOf("data-quote-product-step"),
      consoleSource.indexOf("data-quote-tonnage-step"),
      consoleSource.indexOf("data-quote-delivery-step"),
      consoleSource.indexOf("data-quote-apply"),
    ];
    assert.ok(sequence.every((position) => position >= 0), `${file} is missing an order step`);
    assert.deepEqual(sequence, [...sequence].sort((left, right) => left - right), `${file} has an incorrect order-step sequence`);
    workflows.set(file, { products, deliveryIds });

    assert.equal((source.match(/\bdata-contact-form\b/g) || []).length, 1);
    assert.equal((source.match(/\bdata-form-status\b/g) || []).length, 1);
    assert.equal((source.match(/\bdata-turnstile-container\b/g) || []).length, 1);
  }

  assert.deepEqual(workflows.get("index.html")?.products, workflows.get("en.html")?.products);
  assert.deepEqual(workflows.get("index.html")?.deliveryIds, workflows.get("en.html")?.deliveryIds);

  const script = readFileSync(resolve(projectRoot, "script.js"), "utf8");
  assert.match(script, /\bsetupQuoteConsoles\(\);/, "script.js must initialize the order-console listeners");
});

test("order helpers preserve sequence, grammar and the generated summary at the message limit", () => {
  const { quoteWorkflowState, quoteTonnageUnit, quoteMessageWithUserText } = orderHelperApi();

  assert.deepEqual(quoteWorkflowState(false, null, false), {
    tonnageEnabled: false,
    deliveryEnabled: false,
    isReady: false,
  });
  assert.deepEqual(quoteWorkflowState(true, null, false), {
    tonnageEnabled: true,
    deliveryEnabled: false,
    isReady: false,
  });
  assert.deepEqual(quoteWorkflowState(true, 125, false), {
    tonnageEnabled: true,
    deliveryEnabled: true,
    isReady: false,
  });
  assert.deepEqual(quoteWorkflowState(true, 125, true), {
    tonnageEnabled: true,
    deliveryEnabled: true,
    isReady: true,
  });

  const units = { unitSingular: "ton", unitPlural: "tons" };
  assert.equal(quoteTonnageUnit(units, 1), "ton");
  assert.equal(quoteTonnageUnit(units, 2), "tons");

  const generatedBlock = [
    "Order summary:",
    "Material / size: Crushed stone 0–5 mm",
    "Tonnage: 1 ton",
    "Delivery point: Urla project-site delivery",
  ].join("\n");
  const textarea = { maxLength: 2000, value: "Long project note ".repeat(130).slice(0, 1990) };
  const merged = quoteMessageWithUserText(textarea, generatedBlock);
  assert.ok(merged.startsWith(generatedBlock));
  assert.ok(merged.includes("Long project note"));
  assert.ok(merged.length <= textarea.maxLength);
});

test("reference logos stay full color before and after hover", () => {
  const stylesheet = readFileSync(resolve(projectRoot, "liquid-glass.css"), "utf8");
  const baseRule = stylesheet.match(/\.reference-grid article\s*\{([^}]*)\}/)?.[1] || "";
  const hoverRule = stylesheet.match(/\.reference-grid article:hover\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(baseRule, /\bfilter:\s*none\s*;/);
  assert.match(baseRule, /\bopacity:\s*1\s*;/);
  assert.doesNotMatch(baseRule, /grayscale\(/);
  assert.doesNotMatch(hoverRule, /\bfilter\s*:/);
  assert.doesNotMatch(hoverRule, /\bopacity\s*:/);
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

test("export headers expose localized clickable Bemaş home logos", () => {
  const routes = [
    {
      file: "export-tr.html",
      href: "/",
      label: "Bemaş anasayfasına dön",
    },
    {
      file: "export.html",
      href: "/en.html",
      label: "Return to Bemaş homepage",
    },
  ];

  for (const { file, href, label } of routes) {
    const source = html(file);
    const header = source.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] || "";
    const homeLink =
      header.match(
        /<a\b(?=[^>]*\bclass=["'][^"']*\bexport-home-link\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/i,
      )?.[0] || "";

    assert.ok(homeLink, `${file} is missing its export home-logo link`);

    const openingTag = tags(homeLink, "a")[0] || "";
    assert.equal(attribute(openingTag, "href"), href);
    assert.equal(attribute(openingTag, "aria-label"), label);
    assert.equal(attribute(openingTag, "target"), "", `${file} logo must navigate in the same tab`);

    const logos = tags(homeLink, "img");
    assert.equal(logos.length, 1);
    assert.match(attribute(logos[0], "src"), /^\/?assets\/bemas-logo\.svg\?v=20260611-phone$/);
    assert.equal(attribute(logos[0], "width"), "2620");
    assert.equal(attribute(logos[0], "height"), "1350");
    assert.ok(
      header.indexOf(homeLink) < header.search(/<nav\b/i),
      `${file} home logo must precede the language navigation`,
    );

    const stylesheet = tags(source, "link").find((tag) => attribute(tag, "href").includes("styles.css")) || "";
    assert.equal(attribute(stylesheet, "href"), "styles.css?v=20260730-export-logo-1");
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
