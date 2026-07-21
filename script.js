const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const languageLinks = document.querySelectorAll("[data-lang-choice]");
const animatedSections = document.querySelectorAll("[data-animate]");
const staggerGroups = document.querySelectorAll(".stagger-group");
const counters = document.querySelectorAll("[data-counter]");
const certificateTracks = document.querySelectorAll("[data-certificate-track]");
const siteLanguage = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "tr";
const languageStorageKey = "bemasmining-language";
const analyticsStorageKey = "bemas-analytics-consent-v1";
const analyticsId = document.querySelector('meta[name="bemas-analytics-id"]')?.content.trim() || "";
const analyticsIsLiveHost = window.location.hostname === "bemasagrega.com";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const menuLabels = {
  tr: {
    open: "Menüyü aç",
    close: "Menüyü kapat",
  },
  en: {
    open: "Open menu",
    close: "Close menu",
  },
};

const carouselLabels = {
  tr: {
    pause: "Otomatik kaydırmayı duraklat",
    resume: "Otomatik kaydırmayı sürdür",
    reduced: "Otomatik kaydırma, hareket azaltma tercihiniz nedeniyle kapalı",
    region: "yatay görsel galerisi",
  },
  en: {
    pause: "Pause automatic scrolling",
    resume: "Resume automatic scrolling",
    reduced: "Automatic scrolling is off because reduced motion is enabled",
    region: "horizontal image gallery",
  },
};

const analyticsConsentLabels = {
  tr: {
    title: "Analitik ölçüm tercihiniz",
    description:
      "Site kullanımını anlamak için Google Analytics yalnızca izninizden sonra yüklenir. Reddettiğinizde analitik ölçüm gönderilmez.",
    accept: "Analitiğe izin ver",
    reject: "Analitiği reddet",
    close: "Kapat",
    manage: "Analitik tercihleri",
    currentUnset: "Mevcut tercih: Henüz seçim yapılmadı.",
    currentGranted: "Mevcut tercih: Analitiğe izin verildi.",
    currentDenied: "Mevcut tercih: Analitik reddedildi.",
    savedGranted: "Analitik tercihiniz izin verildi olarak kaydedildi.",
    savedDenied: "Analitik tercihiniz reddedildi olarak kaydedildi.",
  },
  en: {
    title: "Your analytics preference",
    description:
      "Google Analytics loads only after your permission so we can understand site usage. If you decline, no analytics measurement is sent.",
    accept: "Allow analytics",
    reject: "Decline analytics",
    close: "Close",
    manage: "Analytics preferences",
    currentUnset: "Current preference: No choice has been made yet.",
    currentGranted: "Current preference: Analytics is allowed.",
    currentDenied: "Current preference: Analytics is declined.",
    savedGranted: "Your preference to allow analytics has been saved.",
    savedDenied: "Your preference to decline analytics has been saved.",
  },
};

const formMessages = {
  tr: {
    email: "info@bemasmining.com",
    subject: "Bemaş web sitesi talep formu",
    status: "E-posta uygulamanız açılıyor. Talebiniz info@bemasmining.com adresine hazırlanıyor.",
    fields: {
      name: "Ad Soyad / Firma",
      phone: "Telefon",
      product: "İhtiyaç duyulan ürün",
      message: "Mesaj",
    },
  },
  en: {
    email: "info@bemasmining.com",
    subject: "Bemaş website request form",
    status: "Your email app is opening. The request is being prepared for info@bemasmining.com.",
    fields: {
      name: "Name / Company",
      phone: "Phone",
      product: "Required product",
      message: "Message",
    },
  },
};

function normalizeLanguage(value) {
  return value === "tr" || value === "en" ? value : "";
}

function getStoredLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(languageStorageKey));
  } catch {
    return "";
  }
}

function setStoredLanguage(language) {
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    // Browsers may block storage in strict privacy modes; direct navigation still works.
  }
}

function languageUrl(language) {
  const url = new URL(language === "tr" ? "/" : "/en.html", window.location.href);
  return url;
}

function redirectToLanguage(language) {
  if (!language || language === siteLanguage) {
    return false;
  }

  window.location.replace(languageUrl(language).toString());
  return true;
}

function isExplicitLanguagePage() {
  return window.location.pathname.split("/").pop() === "en.html";
}

function fallbackDetectedLanguage() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  if (browserLanguages.some((language) => String(language || "").toLowerCase().startsWith("tr"))) {
    return "tr";
  }

  return timeZone === "Europe/Istanbul" ? "tr" : "en";
}

let analyticsConsentReturnFocus = null;
let analyticsConsentResizeObserver = null;
let analyticsConsentResizeHandler = null;

function readAnalyticsConsent() {
  try {
    const value = localStorage.getItem(analyticsStorageKey);
    return value === "granted" || value === "denied" ? value : "";
  } catch {
    return "";
  }
}

function writeAnalyticsConsent(value) {
  try {
    localStorage.setItem(analyticsStorageKey, value);
  } catch {
    // The choice still applies for this page when storage is unavailable.
  }
}

function setAnalyticsDisabled(isDisabled) {
  if (!analyticsId) {
    return;
  }

  window[`ga-disable-${analyticsId}`] = isDisabled;

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: isDisabled ? "denied" : "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
}

function expireAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

  if (!cookieNames.length) {
    return;
  }

  const hostname = window.location.hostname;
  const hostnameParts = hostname.split(".").filter(Boolean);
  const registrableDomain = hostnameParts.length > 1 ? hostnameParts.slice(-2).join(".") : hostname;
  const domains = new Set(["", hostname, `.${hostname}`, registrableDomain, `.${registrableDomain}`]);

  cookieNames.forEach((name) => {
    domains.forEach((domain) => {
      const domainAttribute = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; path=/${domainAttribute}; SameSite=Lax`;
    });
  });
}

function loadAnalytics() {
  if (!/^G-[A-Z0-9]+$/.test(analyticsId)) {
    return;
  }

  setAnalyticsDisabled(false);

  if (!analyticsIsLiveHost) {
    document.documentElement.dataset.analyticsState = "preview";
    return;
  }

  if (document.querySelector("script[data-bemas-analytics]")) {
    document.documentElement.dataset.analyticsState = "loaded";
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", analyticsId, { anonymize_ip: true });

  const analyticsScript = document.createElement("script");
  analyticsScript.async = true;
  analyticsScript.dataset.bemasAnalytics = "";
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
  analyticsScript.referrerPolicy = "strict-origin-when-cross-origin";
  analyticsScript.addEventListener("load", () => {
    document.documentElement.dataset.analyticsState = "loaded";
  });
  analyticsScript.addEventListener("error", () => {
    document.documentElement.dataset.analyticsState = "error";
  });

  document.documentElement.dataset.analyticsState = "loading";
  document.head.appendChild(analyticsScript);
}

function announceAnalyticsConsent(message) {
  let status = document.querySelector("[data-analytics-consent-status]");
  if (!status) {
    status = document.createElement("div");
    status.className = "visually-hidden";
    status.dataset.analyticsConsentStatus = "";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.appendChild(status);
  }

  status.textContent = "";
  window.requestAnimationFrame(() => {
    status.textContent = message;
  });
}

function focusMainContent() {
  const main = document.querySelector("main");
  if (!main) {
    return;
  }

  const addedTabIndex = !main.hasAttribute("tabindex");
  if (addedTabIndex) {
    main.setAttribute("tabindex", "-1");
    main.addEventListener(
      "blur",
      () => {
        main.removeAttribute("tabindex");
      },
      { once: true },
    );
  }

  main.focus({ preventScroll: true });
}

function stopAnalyticsConsentSizing() {
  analyticsConsentResizeObserver?.disconnect();
  analyticsConsentResizeObserver = null;

  if (analyticsConsentResizeHandler) {
    window.removeEventListener("resize", analyticsConsentResizeHandler);
    analyticsConsentResizeHandler = null;
  }

  document.body.classList.remove("analytics-consent-visible");
  document.body.style.removeProperty("--analytics-consent-space");
}

function startAnalyticsConsentSizing(banner) {
  const updateSpace = () => {
    document.body.style.setProperty("--analytics-consent-space", `${Math.ceil(banner.offsetHeight + 32)}px`);
  };

  document.body.classList.add("analytics-consent-visible");
  updateSpace();

  if ("ResizeObserver" in window) {
    analyticsConsentResizeObserver = new ResizeObserver(updateSpace);
    analyticsConsentResizeObserver.observe(banner);
  } else {
    analyticsConsentResizeHandler = updateSpace;
    window.addEventListener("resize", analyticsConsentResizeHandler);
  }
}

function hideAnalyticsConsentBanner({ announcement = "", focusMain = false } = {}) {
  document.querySelector("[data-analytics-consent-banner]")?.remove();
  stopAnalyticsConsentSizing();

  if (announcement) {
    announceAnalyticsConsent(announcement);
  }

  if (analyticsConsentReturnFocus && document.contains(analyticsConsentReturnFocus)) {
    const returnFocus = analyticsConsentReturnFocus;
    window.requestAnimationFrame(() => returnFocus.focus());
  } else if (focusMain) {
    window.requestAnimationFrame(focusMainContent);
  }

  analyticsConsentReturnFocus = null;
}

function applyAnalyticsConsent(value) {
  const previousValue = document.documentElement.dataset.analyticsConsent || readAnalyticsConsent();
  const labels = analyticsConsentLabels[siteLanguage];
  const announcement = value === "granted" ? labels.savedGranted : labels.savedDenied;

  if (previousValue === value) {
    hideAnalyticsConsentBanner({ announcement });
    return;
  }

  writeAnalyticsConsent(value);
  document.documentElement.dataset.analyticsConsent = value;

  if (value === "granted") {
    loadAnalytics();
  } else {
    setAnalyticsDisabled(true);
    expireAnalyticsCookies();
    document.documentElement.dataset.analyticsState = "disabled";
  }

  const shouldReload = previousValue === "granted" && value === "denied";
  hideAnalyticsConsentBanner({ announcement, focusMain: !analyticsConsentReturnFocus });

  if (shouldReload) {
    window.setTimeout(() => window.location.reload(), 250);
  }
}

function showAnalyticsConsentBanner({ focus = false, returnFocus = null } = {}) {
  const existingBanner = document.querySelector("[data-analytics-consent-banner]");
  if (returnFocus) {
    analyticsConsentReturnFocus = returnFocus;
  }

  if (existingBanner) {
    if (focus) {
      existingBanner.querySelector("[data-analytics-reject]")?.focus();
    }
    return;
  }

  const labels = analyticsConsentLabels[siteLanguage];
  const currentConsent = document.documentElement.dataset.analyticsConsent || readAnalyticsConsent() || "unset";
  const banner = document.createElement("section");
  const copy = document.createElement("div");
  const title = document.createElement("h2");
  const description = document.createElement("p");
  const currentPreference = document.createElement("p");
  const actions = document.createElement("div");
  const rejectButton = document.createElement("button");
  const acceptButton = document.createElement("button");
  const closeButton = document.createElement("button");

  banner.className = "analytics-consent-banner";
  banner.dataset.analyticsConsentBanner = "";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-labelledby", "analytics-consent-title");
  banner.setAttribute("aria-describedby", "analytics-consent-description analytics-consent-current");

  copy.className = "analytics-consent-copy";
  title.id = "analytics-consent-title";
  title.textContent = labels.title;
  description.id = "analytics-consent-description";
  description.textContent = labels.description;
  currentPreference.id = "analytics-consent-current";
  currentPreference.className = "analytics-consent-current";
  currentPreference.textContent =
    currentConsent === "granted"
      ? labels.currentGranted
      : currentConsent === "denied"
        ? labels.currentDenied
        : labels.currentUnset;
  copy.append(title, description, currentPreference);

  actions.className = "analytics-consent-actions";
  rejectButton.type = "button";
  rejectButton.className = "analytics-consent-button secondary";
  rejectButton.dataset.analyticsReject = "";
  rejectButton.textContent = labels.reject;
  rejectButton.addEventListener("click", () => applyAnalyticsConsent("denied"));

  acceptButton.type = "button";
  acceptButton.className = "analytics-consent-button primary";
  acceptButton.dataset.analyticsAccept = "";
  acceptButton.textContent = labels.accept;
  acceptButton.addEventListener("click", () => applyAnalyticsConsent("granted"));

  actions.append(rejectButton, acceptButton);

  if (analyticsConsentReturnFocus) {
    closeButton.type = "button";
    closeButton.className = "analytics-consent-button close";
    closeButton.dataset.analyticsClose = "";
    closeButton.textContent = labels.close;
    closeButton.addEventListener("click", () => hideAnalyticsConsentBanner());
    actions.appendChild(closeButton);
  }

  banner.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && analyticsConsentReturnFocus) {
      event.preventDefault();
      hideAnalyticsConsentBanner();
    }
  });

  banner.append(copy, actions);
  const main = document.querySelector("main");
  if (main) {
    main.before(banner);
  } else {
    document.body.appendChild(banner);
  }
  startAnalyticsConsentSizing(banner);

  if (focus) {
    window.requestAnimationFrame(() => rejectButton.focus());
  }
}

function setupAnalyticsConsent() {
  if (!/^G-[A-Z0-9]+$/.test(analyticsId)) {
    return;
  }

  const labels = analyticsConsentLabels[siteLanguage];
  const footerBottom = document.querySelector(".footer-bottom");
  let preferencesButton = document.querySelector("[data-analytics-preferences]");
  if (!preferencesButton && footerBottom) {
    preferencesButton = document.createElement("button");
    preferencesButton.type = "button";
    preferencesButton.className = "analytics-preferences-button";
    preferencesButton.dataset.analyticsPreferences = "";
    preferencesButton.textContent = labels.manage;
    preferencesButton.addEventListener("click", () => {
      showAnalyticsConsentBanner({ focus: true, returnFocus: preferencesButton });
    });
    footerBottom.appendChild(preferencesButton);
  }

  const storedConsent = readAnalyticsConsent();
  document.documentElement.dataset.analyticsConsent = storedConsent || "unset";

  if (storedConsent === "granted") {
    loadAnalytics();
  } else if (storedConsent === "denied") {
    setAnalyticsDisabled(true);
    document.documentElement.dataset.analyticsState = "disabled";
  } else {
    document.documentElement.dataset.analyticsState = "waiting";
    showAnalyticsConsentBanner();
  }
}

function buildContactMailto(formData) {
  const messages = formMessages[siteLanguage];
  const fields = messages.fields;
  const body = [
    [fields.name, String(formData.get("name") || "").trim()],
    [fields.phone, String(formData.get("phone") || "").trim()],
    [fields.product, String(formData.get("product") || "").trim()],
    [fields.message, String(formData.get("message") || "").trim()],
  ]
    .map(([label, value]) => `${label}: ${value || "-"}`)
    .join("\n");
  const params = new URLSearchParams({
    subject: messages.subject,
    body,
  });

  return `mailto:${messages.email}?${params.toString()}`;
}

function prepareStaggerItems() {
  staggerGroups.forEach((group) => {
    Array.from(group.children).forEach((item, index) => {
      item.classList.add("stagger-item");
      item.style.setProperty("--stagger-delay", `${Math.min(index, 8) * 65}ms`);
    });
  });
}

function revealAllMotionElements() {
  animatedSections.forEach((section) => {
    section.classList.add("is-visible");
  });
}

function formatCounterValue(value) {
  const locale = siteLanguage === "en" ? "en-US" : "tr-TR";

  return new Intl.NumberFormat(locale).format(Math.round(value));
}

function setCounterValue(counter, value) {
  counter.textContent = `${formatCounterValue(value)}${counter.dataset.suffix || ""}`;
}

function animateCounter(counter) {
  const targetValue = Number(counter.dataset.count || 0);

  if (!Number.isFinite(targetValue) || counter.dataset.counterDone === "true") {
    return;
  }

  counter.dataset.counterDone = "true";

  if (reducedMotionQuery.matches) {
    setCounterValue(counter, targetValue);
    return;
  }

  const duration = 700;
  const startTime = performance.now();
  const finishTimer = window.setTimeout(() => {
    setCounterValue(counter, targetValue);
  }, duration + 160);

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    setCounterValue(counter, targetValue * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      window.clearTimeout(finishTimer);
      setCounterValue(counter, targetValue);
    }
  }

  setCounterValue(counter, 0);
  requestAnimationFrame(tick);
}

function setupCounters() {
  if (!counters.length) {
    return;
  }

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    counters.forEach((counter) => animateCounter(counter));
    return;
  }

  const counterItems = Array.from(counters);
  counterItems.forEach((counter) => setCounterValue(counter, 0));

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.45,
    },
  );

  counterItems.forEach((counter) => counterObserver.observe(counter));
}

function markCloneInactive(clone, cloneDatasetName) {
  clone.dataset[cloneDatasetName] = "true";
  clone.setAttribute("aria-hidden", "true");
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((item) => item.removeAttribute("id"));
  clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((item) => {
    item.setAttribute("tabindex", "-1");
  });
}

let carouselControlIndex = 0;

function setupLoopingCarousel({
  scrollElement,
  track,
  originalItems,
  cloneDatasetName,
  readyDatasetName,
  prevButton,
  nextButton,
  mobileSpeed = 36,
  desktopSpeed = 48,
}) {
  if (!scrollElement || !track || scrollElement.dataset[readyDatasetName] === "true" || originalItems.length < 2) {
    return;
  }

  scrollElement.dataset[readyDatasetName] = "true";

  const originals = originalItems.filter((item) => item.dataset[cloneDatasetName] !== "true");
  const clones = document.createDocumentFragment();

  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    markCloneInactive(clone, cloneDatasetName);
    clones.appendChild(clone);
  });
  track.appendChild(clones);

  let loopDistance = 0;
  let pendingPixels = 0;
  let lastTickTime = performance.now();
  let pointerInside = false;
  let hasFocus = false;
  let pausedUntil = 0;
  let userPaused = reducedMotionQuery.matches;
  let isInViewport = !("IntersectionObserver" in window);
  let animationFrameId = 0;
  let resumeTimerId = 0;

  carouselControlIndex += 1;
  if (!scrollElement.id) {
    scrollElement.id = `looping-carousel-${carouselControlIndex}`;
  }

  const sectionTitle = scrollElement.closest("section")?.querySelector("h2")?.textContent.trim() || "";
  if (!scrollElement.hasAttribute("tabindex")) {
    scrollElement.tabIndex = 0;
  }
  if (!scrollElement.hasAttribute("aria-label")) {
    scrollElement.setAttribute(
      "aria-label",
      sectionTitle ? `${sectionTitle} — ${carouselLabels[siteLanguage].region}` : carouselLabels[siteLanguage].region,
    );
  }

  const autoplayControls = document.createElement("div");
  const autoplayToggle = document.createElement("button");
  autoplayControls.className = "carousel-autoplay-controls";
  autoplayToggle.className = "carousel-autoplay-toggle";
  autoplayToggle.type = "button";
  autoplayToggle.dataset.carouselAutoplayToggle = "";
  autoplayToggle.setAttribute("aria-controls", scrollElement.id);
  autoplayControls.appendChild(autoplayToggle);

  const controlAnchor = scrollElement.closest(
    ".izmir-carousel-wrap, .urla-carousel-wrap, .machinery-carousel-wrap, .materials-carousel-wrap",
  ) || scrollElement;
  controlAnchor.insertAdjacentElement("afterend", autoplayControls);

  const pixelsPerSecond = () => (window.matchMedia("(max-width: 768px)").matches ? mobileSpeed : desktopSpeed);

  const updateAutoplayToggle = () => {
    const labels = carouselLabels[siteLanguage];
    const label = reducedMotionQuery.matches ? labels.reduced : userPaused ? labels.resume : labels.pause;

    autoplayToggle.textContent = label;
    autoplayToggle.setAttribute("aria-label", sectionTitle ? `${label}: ${sectionTitle}` : label);
    autoplayToggle.dataset.carouselPaused = String(userPaused || reducedMotionQuery.matches);
    autoplayToggle.disabled = reducedMotionQuery.matches;
  };

  const writeScrollLeft = (value) => {
    scrollElement.scrollLeft = value;

    if (Math.abs(scrollElement.scrollLeft - value) > 0.5 && typeof scrollElement.scrollTo === "function") {
      scrollElement.scrollTo(value, 0);
    }
  };

  const normalizeScrollPosition = () => {
    if (!loopDistance) {
      return;
    }

    if (scrollElement.scrollLeft >= loopDistance) {
      writeScrollLeft(scrollElement.scrollLeft - loopDistance);
    } else if (scrollElement.scrollLeft < 0) {
      writeScrollLeft(loopDistance + scrollElement.scrollLeft);
    }
  };

  const updateCarouselMetrics = () => {
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const distance = originals.reduce((total, item) => total + item.getBoundingClientRect().width, 0) + gap * originals.length;
    const duration = Math.max(36, Math.round(distance / Math.max(desktopSpeed, 1)));

    loopDistance = Math.max(distance, 1);
    track.style.setProperty("--certificate-scroll-distance", `${loopDistance}px`);
    track.style.setProperty("--certificate-scroll-duration", `${duration}s`);
    normalizeScrollPosition();
    syncAnimation();
  };

  const canAnimate = () =>
    isInViewport &&
    !userPaused &&
    !pointerInside &&
    !hasFocus &&
    !document.hidden &&
    !reducedMotionQuery.matches &&
    performance.now() >= pausedUntil &&
    loopDistance > scrollElement.clientWidth;

  const stopAnimation = () => {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    pendingPixels = 0;
    scrollElement.dataset.carouselAnimationState = "paused";
  };

  const step = (now) => {
    animationFrameId = 0;
    if (!canAnimate()) {
      return;
    }

    const elapsed = Math.min(now - lastTickTime, 160);
    lastTickTime = now;

    if (loopDistance > scrollElement.clientWidth) {
      pendingPixels += (elapsed / 1000) * pixelsPerSecond();

      const wholePixels = Math.trunc(pendingPixels);
      if (wholePixels >= 1) {
        pendingPixels -= wholePixels;
        writeScrollLeft(scrollElement.scrollLeft + wholePixels);
        normalizeScrollPosition();
      }
    }

    animationFrameId = window.requestAnimationFrame(step);
  };

  const startAnimation = () => {
    if (animationFrameId || !canAnimate()) {
      return;
    }

    lastTickTime = performance.now();
    scrollElement.dataset.carouselAnimationState = "running";
    animationFrameId = window.requestAnimationFrame(step);
  };

  const syncAnimation = () => {
    if (canAnimate()) {
      startAnimation();
    } else {
      stopAnimation();
    }
  };

  const pauseTemporarily = (duration = 1300) => {
    pausedUntil = performance.now() + duration;
    pendingPixels = 0;
    lastTickTime = performance.now();
    stopAnimation();
    window.clearTimeout(resumeTimerId);
    resumeTimerId = window.setTimeout(syncAnimation, duration + 24);
  };

  const scrollByAmount = (direction) => {
    pauseTemporarily(900);
    const amount = Math.min(640, scrollElement.clientWidth * 0.85);

    if (direction < 0 && scrollElement.scrollLeft < amount) {
      writeScrollLeft(scrollElement.scrollLeft + loopDistance);
    }

    scrollElement.scrollBy({ left: direction * amount, behavior: "smooth" });
    window.setTimeout(normalizeScrollPosition, 760);
  };

  requestAnimationFrame(updateCarouselMetrics);
  window.setTimeout(updateCarouselMetrics, 400);
  window.setTimeout(updateCarouselMetrics, 1200);
  window.addEventListener("resize", updateCarouselMetrics, { passive: true });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(updateCarouselMetrics, 240);
  });
  document.addEventListener("visibilitychange", () => {
    lastTickTime = performance.now();
    syncAnimation();
  });

  scrollElement.addEventListener("pointerenter", () => {
    pointerInside = true;
    syncAnimation();
  });
  scrollElement.addEventListener("pointerleave", () => {
    pointerInside = false;
    lastTickTime = performance.now();
    syncAnimation();
  });
  controlAnchor.addEventListener("focusin", () => {
    hasFocus = true;
    userPaused = true;
    updateAutoplayToggle();
    syncAnimation();
  });
  controlAnchor.addEventListener("focusout", () => {
    hasFocus = false;
    lastTickTime = performance.now();
    syncAnimation();
  });
  scrollElement.addEventListener("touchstart", () => pauseTemporarily(1400), { passive: true });
  scrollElement.addEventListener("touchend", () => pauseTemporarily(700), { passive: true });
  scrollElement.addEventListener("wheel", () => pauseTemporarily(1000), { passive: true });
  scrollElement.addEventListener("keydown", () => pauseTemporarily(1000));

  prevButton?.addEventListener("click", () => scrollByAmount(-1));
  nextButton?.addEventListener("click", () => scrollByAmount(1));

  autoplayToggle.addEventListener("click", () => {
    userPaused = !userPaused;
    pendingPixels = 0;
    lastTickTime = performance.now();
    updateAutoplayToggle();
    syncAnimation();
  });

  reducedMotionQuery.addEventListener("change", () => {
    if (reducedMotionQuery.matches) {
      userPaused = true;
    }
    updateAutoplayToggle();
    syncAnimation();
  });

  if ("IntersectionObserver" in window) {
    const carouselObserver = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting;
        lastTickTime = performance.now();
        syncAnimation();
      },
      { threshold: 0.05 },
    );
    carouselObserver.observe(scrollElement);
  }

  updateAutoplayToggle();
  syncAnimation();
}

function setupCertificateCarousels() {
  if (!certificateTracks.length) {
    return;
  }

  certificateTracks.forEach((track) => {
    if (track.dataset.carouselReady === "true") {
      return;
    }

    const carousel = track.closest(".certificate-carousel");
    const originalCards = Array.from(track.children).filter((card) => !card.dataset.certificateClone);

    if (originalCards.length < 2) {
      return;
    }

    originalCards
      .sort((first, second) => {
        const firstYear = Number(first.dataset.awardYear || 0);
        const secondYear = Number(second.dataset.awardYear || 0);
        const firstOrder = Number(first.dataset.awardOrder || 0);
        const secondOrder = Number(second.dataset.awardOrder || 0);

        return firstYear - secondYear || firstOrder - secondOrder;
      })
      .forEach((card) => track.appendChild(card));

    track.dataset.carouselReady = "true";
    track.classList.add("is-certificate-carousel");

    setupLoopingCarousel({
      scrollElement: carousel,
      track,
      originalItems: originalCards,
      cloneDatasetName: "certificateClone",
      readyDatasetName: "certificateLoopReady",
      mobileSpeed: 34,
      desktopSpeed: 42,
    });
  });
}

function setupGalleryCarousels() {
  [
    { selector: "[data-materials-carousel]", cardClass: "materials-carousel-card", buttonPrefix: "materials" },
    { selector: "[data-izmir-carousel]", cardClass: "izmir-carousel-card", buttonPrefix: "izmir" },
    { selector: "[data-urla-carousel]", cardClass: "urla-carousel-card", buttonPrefix: "urla" },
    { selector: "[data-machinery-carousel]", cardClass: "machinery-carousel-card", buttonPrefix: "machinery" },
  ].forEach(({ selector, cardClass, buttonPrefix }) => {
    const carousel = document.querySelector(selector);
    if (!carousel) {
      return;
    }

    const wrap = carousel.closest(`.${buttonPrefix}-carousel-wrap`);
    const originalCards = Array.from(carousel.children).filter(
      (item) => item.classList.contains(cardClass) && item.dataset.galleryClone !== "true",
    );

    setupLoopingCarousel({
      scrollElement: carousel,
      track: carousel,
      originalItems: originalCards,
      cloneDatasetName: "galleryClone",
      readyDatasetName: "galleryLoopReady",
      prevButton: wrap?.querySelector(`.${buttonPrefix}-carousel-btn.prev`),
      nextButton: wrap?.querySelector(`.${buttonPrefix}-carousel-btn.next`),
      mobileSpeed: 38,
      desktopSpeed: 52,
    });
  });
}

function revealHashTarget(observer) {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const target = hash ? document.getElementById(hash) : null;
  const animatedTarget = target?.closest("[data-animate]");

  if (!animatedTarget) {
    return;
  }

  animatedTarget.classList.add("is-visible");
  observer?.unobserve(animatedTarget);
}

function setupScrollAnimations() {
  prepareStaggerItems();

  if (!animatedSections.length) {
    return;
  }

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    revealAllMotionElements();
    return;
  }

  document.body.classList.add("is-motion-ready");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.18,
    },
  );

  animatedSections.forEach((section) => {
    revealObserver.observe(section);
  });

  revealHashTarget(revealObserver);
  window.addEventListener("hashchange", () => revealHashTarget(revealObserver));
}

setupCertificateCarousels();
setupGalleryCarousels();
setupScrollAnimations();
setupCounters();

languageLinks.forEach((link) => {
  const language = normalizeLanguage(link.dataset.langChoice);
  if (!language) {
    return;
  }

  link.href = languageUrl(language).toString();

  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    setStoredLanguage(language);
    window.location.href = languageUrl(language).toString();
  });
});

(() => {
  const requestedLanguage = normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));

  if (requestedLanguage) {
    setStoredLanguage(requestedLanguage);
    if (!redirectToLanguage(requestedLanguage)) {
      setupAnalyticsConsent();
    }
    return;
  }

  if (isExplicitLanguagePage()) {
    setupAnalyticsConsent();
    return;
  }

  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    if (!redirectToLanguage(storedLanguage)) {
      setupAnalyticsConsent();
    }
    return;
  }

  const detectedLanguage = fallbackDetectedLanguage();
  if (!redirectToLanguage(detectedLanguage)) {
    setupAnalyticsConsent();
  }
})();

if (menuToggle && nav) {
  if (!nav.id) {
    nav.id = "site-navigation";
  }

  menuToggle.setAttribute("aria-controls", nav.id);

  const navLinks = Array.from(nav.querySelectorAll("a"));

  function setMenuOpen(isOpen, { restoreFocus = false } = {}) {
    nav.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? menuLabels[siteLanguage].close : menuLabels[siteLanguage].open);

    if (restoreFocus) {
      menuToggle.focus();
    }
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = !nav.classList.contains("is-open");
    setMenuOpen(isOpen);

    if (isOpen) {
      window.requestAnimationFrame(() => {
        if (nav.classList.contains("is-open")) {
          navLinks[0]?.focus();
        }
      });
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setMenuOpen(false, { restoreFocus: true });
    }
  });

  const compactNavigationQuery = window.matchMedia("(max-width: 1200px)");
  compactNavigationQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenuOpen(false);
    }
  });
}

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const messages = formMessages[siteLanguage];

    formStatus.textContent = messages.status;
    window.location.href = buildContactMailto(formData);
  });
}
