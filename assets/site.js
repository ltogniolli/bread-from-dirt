const CONFIG_URL = new URL("./site-config.json", import.meta.url);
const CONSENT_KEY = "bread-from-dirt-analytics-consent";
const LANGUAGE_KEY = "bread-from-dirt-language";

const documentLocale = document.documentElement.lang === "pt-BR" ? "pt-BR" : "en";
const labels = documentLocale === "pt-BR"
  ? { download: "Baixar", unavailable: "Em produção" }
  : { download: "Download", unavailable: "In production" };

let analyticsEnabled = false;
let analyticsId = "";

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Storage can be unavailable in hardened browsers. The session still works.
  }
}

function initializeReveals() {
  const reveals = [...document.querySelectorAll(".reveal")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  reveals.forEach((element) => observer.observe(element));
}

function initializeLanguageLinks() {
  document.querySelectorAll("[data-language-switch]").forEach((link) => {
    link.addEventListener("click", () => {
      const destination = link.dataset.languageSwitch;
      writeStorage(LANGUAGE_KEY, destination);
      track("language_switch", {
        source_locale: documentLocale,
        destination_locale: destination,
      });
    });
  });
}

function resolveConfiguredUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return new URL(value.trim(), window.location.href).href;
}

function configureDownloads(localeConfig) {
  document.querySelectorAll("[data-download]").forEach((link) => {
    const format = link.dataset.download;
    if (!Object.prototype.hasOwnProperty.call(localeConfig.downloads || {}, format)) return;
    const configuredUrl = resolveConfiguredUrl(localeConfig.downloads?.[format]);
    const availability = link.querySelector("[data-availability]");

    if (!configuredUrl) {
      link.removeAttribute("href");
      link.removeAttribute("download");
      link.setAttribute("aria-disabled", "true");
      link.classList.add("is-unavailable");
      if (availability) availability.textContent = labels.unavailable;
      return;
    }

    link.href = configuredUrl;
    link.removeAttribute("aria-disabled");
    link.classList.remove("is-unavailable");
    if (new URL(configuredUrl).origin !== window.location.origin) {
      link.removeAttribute("download");
      link.rel = "noopener";
    }
    if (availability) availability.innerHTML = `${labels.download} <span aria-hidden="true">↓</span>`;

    link.addEventListener("click", () => {
      track("download", { language: documentLocale, format });
    });
  });
}

function configureRetailers(localeConfig) {
  let visibleRetailers = 0;

  document.querySelectorAll("[data-retailer]").forEach((link) => {
    const retailer = link.dataset.retailer;
    const configuredUrl = resolveConfiguredUrl(localeConfig.retailers?.[retailer]);
    if (!configuredUrl) return;

    link.href = configuredUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.hidden = false;
    visibleRetailers += 1;
    link.addEventListener("click", () => {
      track("retailer_click", { language: documentLocale, retailer });
    });
  });

  if (visibleRetailers > 0) {
    document.querySelectorAll("[data-support-section], [data-support-link]").forEach((element) => {
      element.hidden = false;
    });
  }
}

function configureAuthor(localeConfig) {
  const author = localeConfig.author || {};
  const bio = document.querySelector("[data-author-bio]");
  const photo = document.querySelector("[data-author-photo]");
  const placeholder = document.querySelector("[data-author-placeholder]");

  if (typeof author.bio === "string" && author.bio.trim() && bio) {
    bio.textContent = author.bio.trim();
  }

  if (typeof author.photo === "string" && author.photo.trim() && photo) {
    photo.src = new URL(author.photo.trim(), CONFIG_URL).href;
    photo.hidden = false;
    if (placeholder) placeholder.hidden = true;
  }
}

function loadAnalytics() {
  if (analyticsEnabled || !analyticsId) return;
  analyticsEnabled = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", analyticsId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
  script.dataset.googleAnalytics = "true";
  document.head.append(script);
}

function revokeAnalytics() {
  analyticsEnabled = false;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }

  document.cookie.split(";").forEach((part) => {
    const name = part.split("=")[0].trim();
    if (/^_ga(?:_|$)/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  });
}

function track(eventName, parameters) {
  if (!analyticsEnabled || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, parameters);
}

function showDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function hideDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function configurePrivacy(measurementId) {
  analyticsId = typeof measurementId === "string" && /^G-[A-Z0-9]+$/i.test(measurementId.trim())
    ? measurementId.trim()
    : "";

  const dialog = document.querySelector("[data-privacy-dialog]");
  const unconfigured = document.querySelector("[data-analytics-unconfigured]");
  const privacyActions = document.querySelector("[data-privacy-actions]");

  document.querySelectorAll("[data-open-privacy]").forEach((button) => {
    button.addEventListener("click", () => showDialog(dialog));
  });
  document.querySelectorAll("[data-close-privacy]").forEach((button) => {
    button.addEventListener("click", () => hideDialog(dialog));
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) hideDialog(dialog);
  });

  if (!analyticsId) {
    if (unconfigured) unconfigured.hidden = false;
    if (privacyActions) privacyActions.hidden = true;
    return;
  }

  if (unconfigured) unconfigured.hidden = true;
  if (privacyActions) privacyActions.hidden = false;

  const savedConsent = readStorage(CONSENT_KEY);
  if (savedConsent !== "denied") loadAnalytics();

  document.querySelectorAll("[data-consent]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.consent;
      writeStorage(CONSENT_KEY, choice);
      hideDialog(dialog);
      if (choice === "granted") loadAnalytics();
      else revokeAnalytics();
    });
  });
}

async function loadConfiguration() {
  try {
    const response = await fetch(CONFIG_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Configuration request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Book-site configuration could not be loaded; using static defaults.", error);
    return { gaMeasurementId: "", locales: {} };
  }
}

async function main() {
  initializeReveals();
  initializeLanguageLinks();
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const configuration = await loadConfiguration();
  const localeConfig = configuration.locales?.[documentLocale] || {};
  configureDownloads(localeConfig);
  configureRetailers(localeConfig);
  configureAuthor(localeConfig);
  configurePrivacy(configuration.gaMeasurementId);
}

main();
