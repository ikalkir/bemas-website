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

const formMessages = {
  tr: {
    email: "destek@bemasmining.com",
    subject: "Bemaş web sitesi talep formu",
    status: "E-posta uygulamanız açılıyor. Talebiniz destek@bemasmining.com adresine hazırlanıyor.",
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
  const url = new URL(language === "tr" ? "./" : "./en.html", window.location.href);
  return url;
}

function redirectToLanguage(language) {
  if (!language || language === siteLanguage) {
    return;
  }

  window.location.replace(languageUrl(language).toString());
}

function fallbackDetectedLanguage() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return timeZone === "Europe/Istanbul" ? "tr" : "en";
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

    if (!carousel || reducedMotionQuery.matches) {
      track.dataset.carouselReady = "true";
      track.classList.add("is-certificate-carousel");
      return;
    }

    const clones = document.createDocumentFragment();

    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);

      clone.dataset.certificateClone = "true";
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((item) => {
        item.setAttribute("tabindex", "-1");
      });
      clones.appendChild(clone);
    });

    track.appendChild(clones);
    track.dataset.carouselReady = "true";
    track.classList.add("is-certificate-carousel");

    let scrollDistance = 0;
    let lastFrameTime = 0;
    let pointerInside = false;
    let hasFocus = false;
    let pausedUntil = 0;

    const updateCarouselMetrics = () => {
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const distance = originalCards.reduce((total, card) => total + card.getBoundingClientRect().width, 0) + gap * originalCards.length;
      const duration = Math.max(36, Math.round(distance / 42));

      scrollDistance = Math.max(distance, 1);
      track.style.setProperty("--certificate-scroll-distance", `${Math.max(distance, 1)}px`);
      track.style.setProperty("--certificate-scroll-duration", `${duration}s`);
    };

    const pauseBriefly = () => {
      pausedUntil = performance.now() + 2600;
    };

    const isPaused = () => pointerInside || hasFocus || performance.now() < pausedUntil || document.hidden;

    const normalizeScrollPosition = () => {
      if (!scrollDistance) {
        return;
      }

      if (carousel.scrollLeft >= scrollDistance) {
        carousel.scrollLeft -= scrollDistance;
      }
    };

    const tick = (now) => {
      if (!lastFrameTime) {
        lastFrameTime = now;
      }

      const elapsed = Math.min(now - lastFrameTime, 80);
      lastFrameTime = now;

      if (!isPaused() && scrollDistance > 0) {
        carousel.scrollLeft += elapsed * 0.042;
        normalizeScrollPosition();
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(updateCarouselMetrics);
    window.addEventListener("resize", updateCarouselMetrics, { passive: true });
    carousel.addEventListener("pointerenter", () => {
      pointerInside = true;
    });
    carousel.addEventListener("pointerleave", () => {
      pointerInside = false;
    });
    carousel.addEventListener("focusin", () => {
      hasFocus = true;
    });
    carousel.addEventListener("focusout", () => {
      hasFocus = false;
    });
    carousel.addEventListener("pointerdown", pauseBriefly, { passive: true });
    carousel.addEventListener("touchstart", pauseBriefly, { passive: true });
    carousel.addEventListener("wheel", pauseBriefly, { passive: true });
    carousel.addEventListener("keydown", pauseBriefly);
    requestAnimationFrame(tick);
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

async function detectVisitorLanguage() {
  try {
    const response = await fetch("https://ipapi.co/country/", {
      cache: "no-store",
    });
    const countryCode = (await response.text()).trim().toUpperCase();

    if (/^[A-Z]{2}$/.test(countryCode)) {
      return countryCode === "TR" ? "tr" : "en";
    }
  } catch {
    // Fall back to browser signals if the country lookup service cannot be reached.
  }

  return fallbackDetectedLanguage();
}

setupCertificateCarousels();
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

(async () => {
  const requestedLanguage = normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));

  if (requestedLanguage) {
    setStoredLanguage(requestedLanguage);
    redirectToLanguage(requestedLanguage);
    return;
  }

  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    redirectToLanguage(storedLanguage);
    return;
  }

  const detectedLanguage = await detectVisitorLanguage();
  redirectToLanguage(detectedLanguage);
})();

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? menuLabels[siteLanguage].close : menuLabels[siteLanguage].open);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", menuLabels[siteLanguage].open);
    });
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
