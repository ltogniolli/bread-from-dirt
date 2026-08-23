const FONT_KEY = "bread-from-dirt-reader-font-size";
const FONT_SIZES = ["0.98rem", "1.06rem", "1.14rem", "1.22rem", "1.3rem"];

function readFontIndex() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(FONT_KEY) || "", 10);
    return Number.isInteger(value) && value >= 0 && value < FONT_SIZES.length ? value : 2;
  } catch (_error) {
    return 2;
  }
}

function saveFontIndex(index) {
  try {
    window.localStorage.setItem(FONT_KEY, String(index));
  } catch (_error) {
    // Reading controls still work for this page view when storage is unavailable.
  }
}

function initializeFontControls() {
  const controls = [...document.querySelectorAll("[data-font-size]")];
  let fontIndex = readFontIndex();

  function applyFontSize() {
    document.documentElement.style.setProperty("--reader-font-size", FONT_SIZES[fontIndex]);
    controls.forEach((button) => {
      const direction = button.dataset.fontSize;
      button.disabled = (direction === "decrease" && fontIndex === 0)
        || (direction === "increase" && fontIndex === FONT_SIZES.length - 1);
    });
  }

  controls.forEach((button) => {
    button.addEventListener("click", () => {
      const change = button.dataset.fontSize === "increase" ? 1 : -1;
      fontIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, fontIndex + change));
      saveFontIndex(fontIndex);
      applyFontSize();
    });
  });

  applyFontSize();
}

function initializeReadingProgress() {
  const book = document.querySelector("[data-reader-book]");
  const indicator = document.querySelector("[data-reading-progress]");
  if (!book || !indicator) return;

  let scheduled = false;
  function update() {
    const start = book.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(1, book.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
    indicator.style.transform = `scaleX(${progress})`;
    scheduled = false;
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  update();
}

function initializeContents() {
  const contents = document.querySelector(".reader-contents");
  if (!contents) return;

  contents.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) contents.open = false;
    });
  });
}

initializeFontControls();
initializeReadingProgress();
initializeContents();
