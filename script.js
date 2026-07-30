const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const quoteConsoles = document.querySelectorAll("[data-quote-console]");
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
    verificationLoading: "Güvenlik doğrulaması yükleniyor…",
    verificationRequired: "Lütfen güvenlik doğrulamasını tamamlayıp tekrar deneyin.",
    verificationUnavailable: "Güvenlik doğrulaması şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin veya info@bemasmining.com adresine yazın.",
    sending: "Talebiniz güvenli biçimde gönderiliyor…",
    success: "Talebiniz Bemaş ekibine ulaştı. En kısa sürede sizinle iletişime geçeceğiz.",
    invalid: "Lütfen zorunlu alanları kontrol edip tekrar deneyin.",
    fieldErrors: {
      name: "Lütfen en az 2 karakterlik ad veya firma adı girin.",
      phone: "Geçerli bir telefon numarası girin.",
      email: "Geçerli bir e-posta adresi girin.",
      product: "Lütfen ihtiyaç duyduğunuz ürünü seçin.",
      message: "Mesaj 2.000 karakteri geçmemelidir.",
    },
    rateLimited: "Kısa sürede çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.",
    unavailable: "Talebiniz şu anda gönderilemedi. Lütfen info@bemasmining.com adresine e-posta gönderin.",
  },
  en: {
    verificationLoading: "Security verification is loading…",
    verificationRequired: "Please complete the security verification and try again.",
    verificationUnavailable: "Security verification could not load right now. Please try again later or email info@bemasmining.com.",
    sending: "Your request is being sent securely…",
    success: "Your request has reached the Bemaş team. We will contact you as soon as possible.",
    invalid: "Please check the required fields and try again.",
    fieldErrors: {
      name: "Enter a name or company name with at least 2 characters.",
      phone: "Enter a valid phone number.",
      email: "Enter a valid email address.",
      product: "Select the product you need.",
      message: "The message must not exceed 2,000 characters.",
    },
    rateLimited: "Too many attempts were made in a short time. Please try again in a few minutes.",
    unavailable: "Your request could not be sent right now. Please email info@bemasmining.com.",
  },
};

const quoteConsoleMessages = {
  tr: {
    blockTitle: "Teklif planlayıcı seçimi",
    product: "Ürün / ebat",
    delivery: "Teslimat",
    success: "Seçiminiz teklif formuna aktarıldı. Eksik iletişim alanını doldurarak devam edebilirsiniz.",
    unavailable: "Teklif formu bu sayfada bulunamadı.",
  },
  en: {
    blockTitle: "Quote planner selection",
    product: "Product / size",
    delivery: "Delivery",
    success: "Your selection was added to the quote form. Complete the missing contact fields to continue.",
    unavailable: "The quote form is not available on this page.",
  },
};

const quoteConsoleState = new WeakMap();

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

function isAutomaticLanguageEntryPage(pathname = window.location.pathname) {
  return pathname === "/" || pathname === "/index.html";
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

function createContactRequestId() {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
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
  clone.querySelectorAll("img").forEach((image) => {
    image.loading = "lazy";
    image.decoding = "async";
    image.setAttribute("fetchpriority", "low");
  });
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
  if (!scrollElement.hasAttribute("role")) {
    scrollElement.setAttribute("role", "region");
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

    scrollElement.scrollBy({ left: direction * amount, behavior: reducedMotionQuery.matches ? "auto" : "smooth" });
    window.setTimeout(normalizeScrollPosition, 760);
  };

  requestAnimationFrame(updateCarouselMetrics);
  const carouselResizeObserver = "ResizeObserver" in window ? new ResizeObserver(updateCarouselMetrics) : null;
  if (carouselResizeObserver) {
    carouselResizeObserver.observe(scrollElement);
    originals.forEach((item) => carouselResizeObserver.observe(item));
  } else {
    window.addEventListener("resize", updateCarouselMetrics, { passive: true });
  }
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

function setupCertificateCarousels(tracks = certificateTracks) {
  if (!tracks.length) {
    return;
  }

  Array.from(tracks).forEach((track) => {
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

const galleryCarouselConfigs = [
  { selector: "[data-materials-carousel]", cardClass: "materials-carousel-card", buttonPrefix: "materials" },
  { selector: "[data-izmir-carousel]", cardClass: "izmir-carousel-card", buttonPrefix: "izmir" },
  { selector: "[data-urla-carousel]", cardClass: "urla-carousel-card", buttonPrefix: "urla" },
  { selector: "[data-machinery-carousel]", cardClass: "machinery-carousel-card", buttonPrefix: "machinery" },
];

function setupGalleryCarousels(configs = galleryCarouselConfigs) {
  configs.forEach(({ selector, cardClass, buttonPrefix }) => {
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

function setupDeferredCarousels() {
  const starters = new Map();

  certificateTracks.forEach((track) => {
    const carousel = track.closest(".certificate-carousel");
    if (carousel) {
      starters.set(carousel, () => setupCertificateCarousels([track]));
    }
  });

  galleryCarouselConfigs.forEach((config) => {
    const carousel = document.querySelector(config.selector);
    if (!carousel || window.getComputedStyle(carousel.closest("section") || carousel).display === "none") {
      return;
    }

    starters.set(carousel, () => setupGalleryCarousels([config]));
  });

  if (!starters.size) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    starters.forEach((start) => start());
    return;
  }

  const setupObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        starters.get(entry.target)?.();
        observer.unobserve(entry.target);
        starters.delete(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "600px 0px",
      threshold: 0,
    },
  );

  starters.forEach((start, target) => setupObserver.observe(target));
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

function sanitizeQuoteText(value) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function setQuoteChoice(group, selectedButton) {
  group.forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function quoteMessageWithUserText(textarea, generatedBlock, previousBlock = "") {
  const maxLength = Number(textarea.maxLength) > 0 ? Number(textarea.maxLength) : 2000;
  const currentValue = sanitizeQuoteText(textarea.value);
  let userText = currentValue;

  if (previousBlock && currentValue === previousBlock) {
    userText = "";
  } else if (previousBlock && currentValue.startsWith(`${previousBlock}\n\n`)) {
    userText = currentValue.slice(previousBlock.length + 2);
  }

  if (!userText) {
    return generatedBlock.slice(0, maxLength);
  }

  const separator = "\n\n";
  const availableForBlock = Math.max(0, maxLength - userText.length - separator.length);
  if (!availableForBlock) {
    return userText.slice(0, maxLength);
  }

  return `${generatedBlock.slice(0, availableForBlock)}${separator}${userText}`.slice(0, maxLength);
}

function setupQuoteConsoles() {
  quoteConsoles.forEach((consoleElement) => {
    const language = consoleElement.dataset.language === "en" ? "en" : "tr";
    const messages = quoteConsoleMessages[language];
    const productChoices = Array.from(consoleElement.querySelectorAll("[data-quote-product]"));
    const deliveryChoices = Array.from(consoleElement.querySelectorAll("[data-quote-delivery]"));
    const applyButton = consoleElement.querySelector("[data-quote-apply]");
    const consoleStatus = consoleElement.querySelector("[data-quote-status]");

    productChoices.forEach((button) => {
      button.addEventListener("click", () => setQuoteChoice(productChoices, button));
    });

    deliveryChoices.forEach((button) => {
      button.addEventListener("click", () => setQuoteChoice(deliveryChoices, button));
    });

    applyButton?.addEventListener("click", () => {
      if (!contactForm) {
        if (consoleStatus) {
          consoleStatus.textContent = messages.unavailable;
        }
        return;
      }

      const productChoice = productChoices.find((button) => button.classList.contains("is-selected")) || productChoices[0];
      const deliveryChoice = deliveryChoices.find((button) => button.classList.contains("is-selected")) || deliveryChoices[0];
      const productField = contactForm.elements.namedItem("product");
      const messageField = contactForm.elements.namedItem("message");

      if (!(productField instanceof HTMLSelectElement) || !(messageField instanceof HTMLTextAreaElement)) {
        if (consoleStatus) {
          consoleStatus.textContent = messages.unavailable;
        }
        return;
      }

      const productValue = sanitizeQuoteText(productChoice?.dataset.quoteProduct);
      const productLabel = sanitizeQuoteText(productChoice?.dataset.quoteLabel);
      const productSize = sanitizeQuoteText(productChoice?.dataset.quoteSize);
      const delivery = sanitizeQuoteText(deliveryChoice?.dataset.quoteDelivery);
      const productDescription =
        productSize && !productLabel.toLocaleLowerCase(language).includes(productSize.toLocaleLowerCase(language))
          ? `${productLabel} — ${productSize}`
          : productLabel;
      const generatedBlock = [
        `${messages.blockTitle}:`,
        `${messages.product}: ${productDescription}`,
        `${messages.delivery}: ${delivery}`,
      ].join("\n");
      const previousBlock = quoteConsoleState.get(consoleElement)?.generatedBlock || "";

      if (Array.from(productField.options).some((option) => option.value === productValue)) {
        productField.value = productValue;
        productField.dispatchEvent(new Event("input", { bubbles: true }));
        productField.dispatchEvent(new Event("change", { bubbles: true }));
      }

      messageField.value = quoteMessageWithUserText(messageField, generatedBlock, previousBlock);
      messageField.dispatchEvent(new Event("input", { bubbles: true }));
      quoteConsoleState.set(consoleElement, { generatedBlock });

      if (consoleStatus) {
        consoleStatus.textContent = messages.success;
      }

      contactForm.closest("#iletisim")?.scrollIntoView({
        behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        block: "start",
      });

      window.requestAnimationFrame(() => {
        const firstBlankRequiredField = Array.from(contactForm.querySelectorAll("[required]")).find(
          (field) => "value" in field && !String(field.value || "").trim(),
        );
        firstBlankRequiredField?.focus({ preventScroll: true });
      });
    });
  });
}

setupDeferredCarousels();
setupScrollAnimations();
setupCounters();
setupQuoteConsoles();

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

  if (!isAutomaticLanguageEntryPage()) {
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

  const compactNavigationQuery = window.matchMedia("(max-width: 1240px)");
  compactNavigationQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenuOpen(false);
    }
  });
}

if (contactForm && formStatus) {
  let contactSubmission = null;
  let turnstileWidgetId = null;
  let turnstileToken = "";
  const messages = formMessages[siteLanguage];
  const submitButton = contactForm.querySelector('[data-contact-submit]');
  const verificationContainer = contactForm.querySelector("[data-turnstile-container]");
  const contactFieldNames = ["name", "phone", "email", "product", "message"];

  function updateContactSubmitState() {
    if (submitButton) {
      submitButton.disabled = contactForm.dataset.submitting === "true" || !turnstileToken;
    }
  }

  function showVerificationMessage(message, state = "error") {
    formStatus.dataset.state = state;
    formStatus.dataset.context = "verification";
    formStatus.textContent = message;
  }

  function clearVerificationMessage() {
    if (formStatus.dataset.context !== "verification") return;
    delete formStatus.dataset.state;
    delete formStatus.dataset.context;
    formStatus.textContent = "";
  }

  function resetContactVerification() {
    turnstileToken = "";
    updateContactSubmitState();
    if (turnstileWidgetId !== null && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  function contactFieldErrorId(fieldName) {
    return `contact-${siteLanguage}-${fieldName}-error`;
  }

  function clearContactFieldError(field) {
    if (!(field instanceof HTMLElement) || !contactFieldNames.includes(field.getAttribute("name"))) return;

    const errorId = contactFieldErrorId(field.getAttribute("name"));
    document.getElementById(errorId)?.remove();
    const describedBy = (field.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== errorId);

    if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
    else field.removeAttribute("aria-describedby");
    field.removeAttribute("aria-invalid");
  }

  function clearContactFieldErrors() {
    contactFieldNames.forEach((fieldName) => {
      clearContactFieldError(contactForm.elements.namedItem(fieldName));
    });
  }

  function showContactFieldErrors(fields = {}) {
    clearContactFieldErrors();
    let firstInvalidField = null;

    contactFieldNames.forEach((fieldName) => {
      if (!fields[fieldName]) return;
      const field = contactForm.elements.namedItem(fieldName);
      if (!(field instanceof HTMLElement)) return;

      const errorId = contactFieldErrorId(fieldName);
      const error = document.createElement("span");
      const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      error.id = errorId;
      error.className = "form-field-error";
      error.textContent = messages.fieldErrors[fieldName] || messages.invalid;
      field.insertAdjacentElement("afterend", error);
      describedBy.add(errorId);
      field.setAttribute("aria-describedby", Array.from(describedBy).join(" "));
      field.setAttribute("aria-invalid", "true");
      firstInvalidField ||= field;
    });

    firstInvalidField?.focus({ preventScroll: false });
  }

  function loadTurnstileScript() {
    if (window.turnstile?.render) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector("script[data-bemas-turnstile]");
      const script = existingScript || document.createElement("script");
      const handleLoad = () => (window.turnstile?.render ? resolve() : reject(new Error("TURNSTILE_UNAVAILABLE")));
      const handleError = () => reject(new Error("TURNSTILE_UNAVAILABLE"));

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      if (!existingScript) {
        script.async = true;
        script.defer = true;
        script.dataset.bemasTurnstile = "";
        script.referrerPolicy = "strict-origin-when-cross-origin";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        document.head.appendChild(script);
      }
    });
  }

  async function initializeContactVerification() {
    updateContactSubmitState();
    showVerificationMessage(messages.verificationLoading, "pending");

    try {
      const configResponse = await fetch(contactForm.action, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const config = await configResponse.json();
      if (!configResponse.ok || config.ok !== true || typeof config.siteKey !== "string" || !config.siteKey.trim()) {
        throw new Error("TURNSTILE_CONFIG_UNAVAILABLE");
      }

      await loadTurnstileScript();
      if (!verificationContainer) throw new Error("TURNSTILE_CONTAINER_MISSING");

      turnstileWidgetId = window.turnstile.render(verificationContainer, {
        sitekey: config.siteKey,
        action: "contact",
        language: siteLanguage,
        size: window.matchMedia("(max-width: 420px)").matches ? "compact" : "flexible",
        "response-field": false,
        callback(token) {
          turnstileToken = String(token || "");
          clearVerificationMessage();
          updateContactSubmitState();
        },
        "expired-callback"() {
          turnstileToken = "";
          showVerificationMessage(messages.verificationRequired);
          updateContactSubmitState();
        },
        "timeout-callback"() {
          turnstileToken = "";
          showVerificationMessage(messages.verificationRequired);
          updateContactSubmitState();
        },
        "error-callback"() {
          turnstileToken = "";
          showVerificationMessage(messages.verificationUnavailable);
          updateContactSubmitState();
        },
      });
    } catch {
      showVerificationMessage(messages.verificationUnavailable);
      updateContactSubmitState();
    }
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (contactForm.dataset.submitting === "true") {
      return;
    }

    if (!turnstileToken) {
      showVerificationMessage(messages.verificationRequired);
      updateContactSubmitState();
      return;
    }

    clearContactFieldErrors();
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());
    payload.language = siteLanguage;
    const fingerprint = JSON.stringify(payload);

    if (!contactSubmission || contactSubmission.fingerprint !== fingerprint) {
      contactSubmission = { fingerprint, requestId: createContactRequestId() };
    }
    payload.requestId = contactSubmission.requestId;
    payload.turnstileToken = turnstileToken;

    contactForm.dataset.submitting = "true";
    contactForm.setAttribute("aria-busy", "true");
    if (submitButton) submitButton.disabled = true;
    formStatus.dataset.state = "pending";
    formStatus.textContent = messages.sending;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    let shouldResetVerification = true;

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "same-origin",
        signal: controller.signal,
      });
      let result = {};
      try {
        result = await response.json();
      } catch {
        // Use the generic unavailable message for malformed server responses.
      }

      if (!response.ok || result.ok !== true) {
        const error = new Error("CONTACT_REQUEST_FAILED");
        error.code = result.code || "MAIL_DELIVERY_FAILED";
        error.fields = result.fields || {};
        throw error;
      }

      contactForm.reset();
      clearContactFieldErrors();
      contactSubmission = null;
      delete formStatus.dataset.context;
      formStatus.dataset.state = "success";
      formStatus.textContent = messages.success;
    } catch (error) {
      formStatus.dataset.state = "error";
      delete formStatus.dataset.context;
      if (error?.code === "VALIDATION_ERROR") {
        shouldResetVerification = false;
        formStatus.textContent = messages.invalid;
        showContactFieldErrors(error.fields);
      } else if (error?.code === "VERIFICATION_FAILED") {
        showVerificationMessage(messages.verificationRequired);
      } else if (error?.code === "RATE_LIMITED") {
        shouldResetVerification = false;
        formStatus.textContent = messages.rateLimited;
      } else {
        formStatus.textContent = messages.unavailable;
      }
    } finally {
      window.clearTimeout(timeout);
      contactForm.dataset.submitting = "false";
      contactForm.removeAttribute("aria-busy");
      if (shouldResetVerification) resetContactVerification();
      else updateContactSubmitState();
    }
  });

  contactForm.addEventListener("input", (event) => {
    clearContactFieldError(event.target);
  });

  initializeContactVerification();
}
