/*
This file loads JSON content and renders all site sections.
It is called by index.html and controls tab switching and contact form submission.
CHANGED: Updated media panes to show multi-item native-style lists.
CHANGED: Work tab supports rich `content` blocks (lists, quotes, buttons), optional `items` + `itemsHeading`, linked deal rows, and quote callouts (hero + in-card).
CHANGED: Contact tab includes faux iOS status bar and profile header (same photo as chat avatar) above the chat thread.
CHANGED: Profile photo box uses scroll-snap auto-advance plus drag/swipe; contact location defaults to New York, NY.
*/

// --- App configuration and state
const DATA_FILES = {
  profile: "assets/data/profile.json",
  work: "assets/data/work.json?v=work-logos",
  now: "assets/data/now.json",
  adventures: "assets/data/adventures.json",
  contact: "assets/data/contact.json"
};

const appState = {
  profile: null,
  work: null,
  now: null,
  adventures: null,
  contact: null,
  profileSlideIndex: 0,
  profileSlideTimer: null,
  profileSlideResumeTimer: null
};

// --- Utility functions
/**
 * Fetches one JSON file and throws a clear error on failure.
 */
async function loadJsonFile(filePath) {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Escapes text so user-controlled strings are rendered safely in HTML.
 */
function escapeHtml(unsafeText) {
  return String(unsafeText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Returns true if the string is safe to embed in a CSS object-position value inside an inline style.
 */
function isSafeObjectPositionValue(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && trimmed.length <= 48 && /^[a-z0-9.%+\s-]+$/i.test(trimmed);
}

/**
 * Returns an element by id and throws if it is missing.
 */
function getRequiredElement(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Missing required element with id "${elementId}"`);
  }

  return element;
}

// --- Tab behavior
/**
 * Wires tab buttons to tab panels with active state toggling.
 */
function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((buttonElement) => {
    buttonElement.addEventListener("click", () => {
      const tabTarget = buttonElement.getAttribute("data-tab-target");

      tabButtons.forEach((currentButton) => currentButton.classList.remove("is-active"));
      tabPanels.forEach((panelElement) => panelElement.classList.remove("is-active"));

      buttonElement.classList.add("is-active");
      getRequiredElement(tabTarget).classList.add("is-active");
    });
  });
}

// --- Section renderers
/**
 * Renders the single-panel About content and top photo in the William tab.
 */
function renderProfileSection() {
  const profileData = appState.profile;
  const aboutCardsElement = getRequiredElement("about-cards");

  const rowsMarkup = profileData.aboutCards
    .map(
      (cardItem) => `
        <div class="about-row">
          <h3>${escapeHtml(cardItem.title)}</h3>
          <p>${escapeHtml(cardItem.body)}</p>
        </div>
      `
    )
    .join("");

  aboutCardsElement.innerHTML = `
    <article class="card about-panel">
      <h1 class="section-title">What I'm About</h1>
      ${rowsMarkup}
    </article>
  `;
  initializeProfileSlideshow();
}

/**
 * Clears any pending photo slideshow timers.
 */
function clearProfileSlideshowTimers() {
  if (appState.profileSlideTimer) {
    clearInterval(appState.profileSlideTimer);
    appState.profileSlideTimer = null;
  }

  if (appState.profileSlideResumeTimer) {
    clearTimeout(appState.profileSlideResumeTimer);
    appState.profileSlideResumeTimer = null;
  }
}

/**
 * Builds the Photos-style slider: auto-advances, short-drag / flick paging, and seamless circular loop.
 */
function initializeProfileSlideshow() {
  const sliderElement = getRequiredElement("headshot-slider");
  const slideshowPhotos = appState.profile.profileSlideshowPhotos || [appState.profile.profilePhoto.src];
  const photoAlt = appState.profile.profilePhoto.alt || "Portrait of William Bartnett";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const realCount = slideshowPhotos.length;

  clearProfileSlideshowTimers();
  appState.profileSlideIndex = 0;

  if (realCount === 0) {
    sliderElement.innerHTML = "";
    return;
  }

  // Loop track: [last clone] [...real photos...] [first clone]
  const loopedPhotos = [slideshowPhotos[realCount - 1], ...slideshowPhotos, slideshowPhotos[0]];

  sliderElement.innerHTML = `
    <div class="headshot-track">
      ${loopedPhotos
        .map(
          (photoSrc) =>
            `<img class="headshot-frame" src="${escapeHtml(photoSrc)}" alt="${escapeHtml(photoAlt)}" draggable="false" />`
        )
        .join("")}
    </div>
  `;

  if (realCount <= 1) {
    return;
  }

  const trackElement = sliderElement.querySelector(".headshot-track");
  let currentDomIndex = 1;
  let trackOffsetX = 0;
  let isPointerDragging = false;
  let isSettling = false;
  let dragStartX = 0;
  let dragOriginOffsetX = 0;
  let hasDragMoved = false;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let pointerVelocity = 0;
  let activePointerId = null;
  let settleTimeoutId = null;

  /**
   * Clears the settle timeout used as a backup when transitionend does not fire.
   */
  function clearSettleTimeout() {
    if (settleTimeoutId !== null) {
      window.clearTimeout(settleTimeoutId);
      settleTimeoutId = null;
    }
  }

  /**
   * Marks the carousel as finished settling after a page animation.
   */
  function finishSettling() {
    clearSettleTimeout();
    trackElement.classList.remove("is-animating");
    normalizeLoopPosition();
    isSettling = false;
  }

  /**
   * Returns the visible width of one photo.
   */
  function getSlideWidth() {
    return sliderElement.clientWidth || 1;
  }

  /**
   * Moves the photo track. Instant jumps have no transition; page changes animate smoothly.
   */
  function setTrackOffset(offsetX, useTransition) {
    trackOffsetX = offsetX;
    const shouldAnimate = useTransition && !prefersReducedMotion;
    trackElement.classList.toggle("is-animating", shouldAnimate);
    trackElement.style.transform = `translate3d(${offsetX}px, 0, 0)`;
  }

  /**
   * Places the track on a DOM slide index (including clones).
   */
  function goToDomIndex(domIndex, useTransition) {
    const slideWidth = getSlideWidth();
    const targetOffset = -domIndex * slideWidth;
    const alreadyThere = Math.abs(targetOffset - trackOffsetX) < 1 && currentDomIndex === domIndex;

    currentDomIndex = domIndex;
    appState.profileSlideIndex = Math.max(0, Math.min(realCount - 1, ((domIndex - 1) + realCount) % realCount));
    setTrackOffset(targetOffset, useTransition && !alreadyThere);

    if (useTransition && !alreadyThere && !prefersReducedMotion) {
      clearSettleTimeout();
      settleTimeoutId = window.setTimeout(finishSettling, 700);
      return true;
    }

    return false;
  }

  /**
   * After landing on a clone, silently teleport to the matching real photo.
   */
  function normalizeLoopPosition() {
    if (currentDomIndex <= 0) {
      goToDomIndex(realCount, false);
      return;
    }

    if (currentDomIndex >= realCount + 1) {
      goToDomIndex(1, false);
    }
  }

  /**
   * Chooses the next/previous/current slide from a short drag, like iPhone Photos.
   */
  function getReleaseTargetDomIndex(dragDistancePx) {
    const slideWidth = getSlideWidth();
    const commitDistance = Math.max(36, slideWidth * 0.12);
    const commitVelocity = 0.12;

    // Swipe left (negative velocity / positive dragDistance in our pointer math) → next photo.
    if (pointerVelocity < -commitVelocity || dragDistancePx > commitDistance) {
      return currentDomIndex + 1;
    }

    // Swipe right → previous photo.
    if (pointerVelocity > commitVelocity || dragDistancePx < -commitDistance) {
      return currentDomIndex - 1;
    }

    return currentDomIndex;
  }

  /**
   * Advances one photo forward with a smooth slide, wrapping circularly.
   */
  function advanceSlide() {
    if (document.hidden || isPointerDragging || isSettling) {
      return;
    }

    isSettling = true;
    const didAnimate = goToDomIndex(currentDomIndex + 1, true);
    if (!didAnimate) {
      finishSettling();
    }
  }

  /**
   * Starts the auto-advance timer (every 7 seconds).
   */
  function startAutoAdvance() {
    clearProfileSlideshowTimers();

    if (prefersReducedMotion) {
      return;
    }

    appState.profileSlideTimer = window.setInterval(advanceSlide, 7000);
  }

  /**
   * Pauses auto-advance while the user is interacting, then resumes shortly after.
   */
  function pauseAutoAdvanceTemporarily() {
    clearProfileSlideshowTimers();
    appState.profileSlideResumeTimer = window.setTimeout(startAutoAdvance, 9000);
  }

  trackElement.addEventListener("transitionend", (event) => {
    if (event.target !== trackElement || event.propertyName !== "transform") {
      return;
    }

    finishSettling();
  });

  sliderElement.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }

    pauseAutoAdvanceTemporarily();
    clearSettleTimeout();
    trackElement.classList.remove("is-animating");
    normalizeLoopPosition();

    isPointerDragging = true;
    isSettling = false;
    hasDragMoved = false;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragOriginOffsetX = trackOffsetX;
    lastPointerX = event.clientX;
    lastPointerTime = performance.now();
    pointerVelocity = 0;

    sliderElement.classList.add("is-dragging");
    sliderElement.setPointerCapture(event.pointerId);
  });

  sliderElement.addEventListener("pointermove", (event) => {
    if (!isPointerDragging || event.pointerId !== activePointerId) {
      return;
    }

    const now = performance.now();
    const timeDelta = Math.max(1, now - lastPointerTime);
    const moveDelta = event.clientX - lastPointerX;
    const instantVelocity = moveDelta / timeDelta;
    pointerVelocity = pointerVelocity * 0.6 + instantVelocity * 0.4;
    lastPointerX = event.clientX;
    lastPointerTime = now;

    const dragDistance = event.clientX - dragStartX;
    if (Math.abs(dragDistance) > 3) {
      hasDragMoved = true;
    }

    setTrackOffset(dragOriginOffsetX + dragDistance, false);
  });

  /**
   * Ends a drag and settles onto the next, previous, or current photo.
   */
  function endPointerDrag(event) {
    if (!isPointerDragging || event.pointerId !== activePointerId) {
      return;
    }

    isPointerDragging = false;
    activePointerId = null;
    sliderElement.classList.remove("is-dragging");

    if (sliderElement.hasPointerCapture(event.pointerId)) {
      sliderElement.releasePointerCapture(event.pointerId);
    }

    const dragDistancePx = dragStartX - event.clientX;
    let targetDomIndex = getReleaseTargetDomIndex(dragDistancePx);
    targetDomIndex = Math.max(0, Math.min(realCount + 1, targetDomIndex));

    isSettling = true;
    const didAnimate = goToDomIndex(targetDomIndex, true);
    if (!didAnimate) {
      finishSettling();
    }

    pauseAutoAdvanceTemporarily();
  }

  sliderElement.addEventListener("pointerup", endPointerDrag);
  sliderElement.addEventListener("pointercancel", endPointerDrag);

  sliderElement.addEventListener("dragstart", (event) => event.preventDefault());
  sliderElement.addEventListener("click", (event) => {
    if (hasDragMoved) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearProfileSlideshowTimers();
      return;
    }

    startAutoAdvance();
  });

  window.addEventListener("resize", () => {
    goToDomIndex(currentDomIndex, false);
  });

  goToDomIndex(1, false);
  startAutoAdvance();
}

/**
 * Ensures each now card has an items array for multi-item display.
 */
function normalizeNowCards(nowCards) {
  return nowCards.map((cardItem) => {
    const hasItemsArray = Array.isArray(cardItem.items) && cardItem.items.length > 0;
    const items = hasItemsArray
      ? cardItem.items
      : [
          {
            thumbnail: cardItem.thumbnail,
            thumbnailAlt: cardItem.thumbnailAlt,
            primaryText: cardItem.primaryText,
            secondaryText: cardItem.secondaryText,
            url: cardItem.url
          }
        ];

    const normalizedItems = items.map((item, itemIndex) => ({
      ...item,
      thumbnail: item.thumbnail || getAutoThumbnail(cardItem.key, itemIndex),
      thumbnailAlt: item.thumbnailAlt || `${cardItem.heading} item ${itemIndex + 1}`
    }));

    return {
      ...cardItem,
      items: normalizedItems
    };
  });
}

/**
 * Returns a default screenshot path when an item thumbnail is missing.
 */
function getAutoThumbnail(cardKey, itemIndex) {
  const autoThumbnailMap = {
    spotify: [
      "assets/images/media/spotify-cover-1.png",
      "assets/images/media/spotify-cover-2.png",
      "assets/images/media/spotify-cover-3.png",
      "assets/images/media/spotify-cover-4.png",
      "assets/images/media/spotify-cover-5.png"
    ],
      beli: [
      "assets/images/media/beli4.jpg",
      "assets/images/media/beli-thumb-1.png",
      "assets/images/media/beli-thumb-2.png",
      "assets/images/media/beli-thumb-3.png",
      "assets/images/media/Brooklyn_thumb.png",
      "assets/images/media/Collina_thumb.png"
    ],
    goodreads: [
      "assets/images/media/goodreads-cover-1.png",
      "assets/images/media/goodreads-cover-2.png",
      "assets/images/media/goodreads-cover-3.png",
      "assets/images/media/goodreads-cover-4.png",
      "assets/images/media/goodreads-cover-5.png",
      "assets/images/media/goodreads-cover-6.png",
      "assets/images/media/goodreads-cover-7.png",
      "assets/images/media/slouching-towards-bethlehem-thumb.png"
    ],
    letterboxd: [
      "assets/images/media/letterboxd-cover-1.png",
      "assets/images/media/letterboxd-cover-2.png",
      "assets/images/media/letterboxd-cover-3.png",
      "assets/images/media/letterboxd-cover-4.png",
      "assets/images/media/letterboxd-cover-5.png"
    ]
  };

  const thumbnailPool = autoThumbnailMap[cardKey] || ["assets/photo-placeholder.svg"];
  const loopedIndex = itemIndex % thumbnailPool.length;

  return thumbnailPool[loopedIndex];
}

/**
 * Returns local App Store icon path by pane key.
 */
function getAppIconPath(cardKey) {
  const iconMap = {
    spotify: "assets/images/apps/spotify-app-icon.jpg",
    beli: "assets/images/apps/beli-app-icon.jpg",
    goodreads: "assets/images/apps/goodreads-app-icon.jpg",
    letterboxd: "assets/images/apps/letterboxd-app-icon.jpg"
  };

  return iconMap[cardKey] || "assets/photo-placeholder.svg";
}

/**
 * Renders multiple visible items in each media pane.
 */
function renderNowCardItems(cardItem) {
  if (cardItem.key === "spotify") {
    return cardItem.items
      .map(
        (item) => {
          const hasAudioClip = typeof item.audioClip === "string" && item.audioClip.trim().length > 0;
          const audioClipUrl = hasAudioClip ? item.audioClip.trim() : "";

          return `
          <a
            class="spotify-item ${hasAudioClip ? "has-preview" : ""}"
            href="${escapeHtml(item.url)}"
            target="_blank"
            rel="noreferrer"
            ${hasAudioClip ? `data-audio-clip="${escapeHtml(audioClipUrl)}"` : ""}
          >
            <div class="spotify-thumb">
              <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt)}" />
              ${
                hasAudioClip
                  ? '<span class="spotify-play-badge" aria-hidden="true"><span class="spotify-play-ring"></span><span class="spotify-play-icon"><span class="spotify-icon-play"></span><span class="spotify-icon-pause"></span></span></span>'
                  : ""
              }
            </div>
            <div>
              <p class="spotify-title">${escapeHtml(item.primaryText)}</p>
              <p class="spotify-artist">${escapeHtml(item.secondaryText)}</p>
            </div>
          </a>
        `;
        }
      )
      .join("");
  }

  if (cardItem.key === "goodreads") {
    return cardItem.items
      .map(
        (item) => `
          <a class="goodreads-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt)}" />
            <div>
              <p class="goodreads-title">${escapeHtml(item.primaryText)}</p>
              <p class="goodreads-author">${escapeHtml(item.secondaryText)}</p>
            </div>
          </a>
        `
      )
      .join("");
  }

  if (cardItem.key === "letterboxd") {
    return `
      <div class="letterboxd-grid">
        ${cardItem.items
          .map(
            (item) => `
              <a class="letterboxd-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(item.primaryText)}">
                <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt)}" />
              </a>
            `
          )
          .join("")}
      </div>
    `;
  }

  return cardItem.items
    .map(
      (item) => `
        <a class="beli-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt)}" />
          <div>
            <p class="beli-title">${escapeHtml(item.primaryText)}</p>
            <p class="beli-subtitle">${escapeHtml(item.secondaryText)}</p>
          </div>
          ${item.rating ? `<span class="beli-score">${escapeHtml(item.rating)}</span>` : ""}
        </a>
      `
    )
    .join("");
}

/**
 * Renders the media cards shown in the William tab right column.
 */
function renderNowSection() {
  const nowCardsElement = getRequiredElement("now-cards");
  const normalizedCards = normalizeNowCards(appState.now.cards);

  const cardsMarkup = normalizedCards
    .map(
      (cardItem) => `
        <article class="card media-card media-card-${escapeHtml(cardItem.key)}">
          <div class="media-row media-row-app-icon-only">
            <img class="media-app-badge" src="${escapeHtml(getAppIconPath(cardItem.key))}" alt="${escapeHtml(cardItem.heading)} app icon" />
            <span class="media-heading-text">${escapeHtml(cardItem.heading)}</span>
          </div>
          <div class="media-pane media-pane-${escapeHtml(cardItem.key)}">
            ${renderNowCardItems(cardItem)}
          </div>
        </article>
      `
    )
    .join("");

  nowCardsElement.innerHTML = cardsMarkup;
  initializeSpotifyPlayback();
}

/**
 * Plays or pauses Spotify clips when a song row is clicked.
 */
function initializeSpotifyPlayback() {
  const spotifyItems = document.querySelectorAll(".spotify-item[data-audio-clip]");
  let activeAudio = null;
  let activeItem = null;

  /**
   * Updates one row icon and state classes based on playback status.
   */
  function setItemState(itemElement, state) {
    itemElement.classList.remove("is-preview-playing", "is-preview-paused");

    if (state === "playing") {
      itemElement.classList.add("is-preview-playing");
      return;
    }

    if (state === "paused") {
      itemElement.classList.add("is-preview-paused");
      return;
    }
  }

  /**
   * Sets the radial progress ring for one row.
   */
  function setItemProgress(itemElement, progressPercent) {
    const boundedPercent = Math.max(0, Math.min(100, progressPercent));
    itemElement.style.setProperty("--play-progress", `${boundedPercent}%`);
  }

  /**
   * Stops the currently active preview clip and clears row state.
   */
  function stopActivePreview(resetPosition = true) {
    if (activeAudio) {
      activeAudio.pause();

      if (resetPosition) {
        activeAudio.currentTime = 0;
      }

      activeAudio = null;
    }

    if (activeItem) {
      setItemState(activeItem, "idle");
      setItemProgress(activeItem, 0);
      activeItem = null;
    }
  }

  spotifyItems.forEach((itemElement) => {
    const clipUrl = itemElement.getAttribute("data-audio-clip");

    if (!clipUrl) {
      return;
    }

    const previewAudio = new Audio(clipUrl);
    previewAudio.preload = "metadata";

    previewAudio.addEventListener("timeupdate", () => {
      if (activeAudio !== previewAudio || activeItem !== itemElement || !previewAudio.duration) {
        return;
      }

      const playbackProgress = (previewAudio.currentTime / previewAudio.duration) * 100;
      setItemProgress(itemElement, playbackProgress);
    });

    previewAudio.addEventListener("ended", () => {
      if (activeAudio === previewAudio) {
        stopActivePreview(true);
      }
    });

    itemElement.addEventListener("click", (event) => {
      event.preventDefault();

      if (activeItem === itemElement && activeAudio === previewAudio) {
        if (previewAudio.paused) {
          previewAudio.play().then(() => {
            setItemState(itemElement, "playing");
          }).catch((playbackError) => {
            console.warn("Spotify preview clip could not resume.", {
              operation: "resumeSpotifyPreview",
              input: { clipUrl },
              error: playbackError instanceof Error ? playbackError.message : String(playbackError)
            });
            setItemState(itemElement, "paused");
          });
        } else {
          previewAudio.pause();
          setItemState(itemElement, "paused");
        }

        return;
      }

      stopActivePreview(true);
      activeAudio = previewAudio;
      activeItem = itemElement;
      setItemState(itemElement, "playing");
      setItemProgress(itemElement, 0);
      previewAudio.currentTime = 0;
      previewAudio.play().catch((playbackError) => {
        console.warn("Spotify preview clip could not start.", {
          operation: "playSpotifyPreview",
          input: { clipUrl },
          error: playbackError instanceof Error ? playbackError.message : String(playbackError)
        });
        stopActivePreview();
      });
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopActivePreview();
    }
  });
}

/**
 * Wraps quote body with typographic double quotes for display (inner text is still escaped separately).
 */
function wrapWorkQuotedBody(text) {
  const trimmed = text != null ? String(text).trim() : "";
  return `\u201C${trimmed}\u201D`;
}

/**
 * Builds markup for a work-tab testimonial / pull quote in a shaded callout box.
 */
function buildWorkQuoteCalloutMarkup(quoteText, attributionLine, extraClass) {
  const baseClass = "work-quote-callout";
  const classNames = extraClass ? `${baseClass} ${extraClass}` : baseClass;
  const attributionMarkup = attributionLine
    ? `<p class="work-quote-callout-attribution">${escapeHtml(attributionLine)}</p>`
    : "";
  const displayQuote = wrapWorkQuotedBody(quoteText);

  return `<div class="${classNames}"><p class="work-quote-callout-text">${escapeHtml(displayQuote)}</p>${attributionMarkup}</div>`;
}

/**
 * Renders inline text, text links, or pill buttons from a segments array (work.json rich content).
 */
function renderWorkSegments(segments) {
  if (!Array.isArray(segments)) {
    return "";
  }

  return segments
    .map((segment) => {
      const piece = segment.text != null ? String(segment.text) : "";

      if (!segment.url) {
        return escapeHtml(piece);
      }

      if (segment.linkStyle === "button") {
        return `<a class="work-link-button" href="${escapeHtml(segment.url)}" target="_blank" rel="noreferrer">${escapeHtml(piece)}</a>`;
      }

      return `<a class="work-inline-link" href="${escapeHtml(segment.url)}" target="_blank" rel="noreferrer">${escapeHtml(piece)}</a>`;
    })
    .join("");
}

/**
 * Renders one row in a rich work list (optional nested children or embedded quote).
 */
function renderWorkListRow(listItem) {
  if (listItem.quote) {
    const quoteData = listItem.quote;
    const attribution = quoteData.attribution || "";

    return `<li class="work-rich-li work-rich-li--quote">${buildWorkQuoteCalloutMarkup(
      quoteData.text,
      attribution,
      "work-quote-callout--nested"
    )}</li>`;
  }

  const segments = listItem.segments || [];
  const isButtonOnlyRow =
    segments.length > 0 &&
    segments.every((segment) => segment.url && segment.linkStyle === "button");
  const liClass = isButtonOnlyRow ? "work-rich-li work-rich-li--button-row" : "work-rich-li";

  const bodyMarkup = renderWorkSegments(segments);
  const nestedMarkup =
    Array.isArray(listItem.children) && listItem.children.length > 0
      ? `<ul class="work-rich-list work-rich-list--nested">${listItem.children.map((child) => renderWorkListRow(child)).join("")}</ul>`
      : "";

  return `<li class="${liClass}">${bodyMarkup}${nestedMarkup}</li>`;
}

/**
 * Renders a bullet or numbered list block from work.json.
 */
function renderWorkListBlock(block) {
  const tagName = block.ordered ? "ol" : "ul";
  const listClass = block.ordered ? "work-rich-list work-rich-list--ordered" : "work-rich-list";

  return `<${tagName} class="${listClass}">${(block.items || []).map((row) => renderWorkListRow(row)).join("")}</${tagName}>`;
}

/**
 * Renders one rich content block inside a work card.
 */
function renderWorkBlock(block) {
  if (block.type === "subheading") {
    return `<h4 class="work-card-subheading">${escapeHtml(block.text)}</h4>`;
  }

  if (block.type === "paragraph") {
    const sectionClass = block.sectionStart ? " work-card-rich-p--section-start" : "";
    return `<p class="work-card-rich-p${sectionClass}">${renderWorkSegments(block.segments)}</p>`;
  }

  if (block.type === "quote") {
    return buildWorkQuoteCalloutMarkup(block.text, block.attribution || "", "");
  }

  if (block.type === "list") {
    return renderWorkListBlock(block);
  }

  return "";
}

/**
 * Renders the full optional `content` array on a work card.
 */
function renderWorkContent(cardItem) {
  const blocks = cardItem.content;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }

  return `<div class="work-card-rich">${blocks.map((block) => renderWorkBlock(block)).join("")}</div>`;
}

/**
 * Renders one work history card: optional logo, title, rich `content`, optional `itemsHeading` + linked deal list, or legacy body/items-only shapes.
 */
function renderWorkCardMarkup(cardItem) {
  const hasContent = Array.isArray(cardItem.content) && cardItem.content.length > 0;
  const hasItems = Array.isArray(cardItem.items) && cardItem.items.length > 0;
  const logoMarkup = cardItem.logo
    ? `<div class="work-card-logo-row"><img class="work-card-logo" src="${escapeHtml(cardItem.logo)}" alt="${escapeHtml(
        cardItem.logoAlt || ""
      )}" /></div>`
    : "";

  const itemsHeadingMarkup =
    hasItems && cardItem.itemsHeading
      ? `<h4 class="work-card-subheading work-card-items-heading">${escapeHtml(cardItem.itemsHeading)}</h4>`
      : "";

  const itemsMarkup = hasItems
    ? cardItem.items
        .map(
          (item) => `
        <div class="work-card-item">
          <a class="work-card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          <p class="work-card-item-sub">${escapeHtml(item.description)}</p>
        </div>
      `
        )
        .join("")
    : "";

  const itemsSectionMarkup = hasItems ? `${itemsHeadingMarkup}<div class="work-card-items">${itemsMarkup}</div>` : "";

  if (hasContent || hasItems) {
    return `
        <article class="card work-card">
          ${logoMarkup}
          <h3>${escapeHtml(cardItem.title)}</h3>
          ${renderWorkContent(cardItem)}
          ${itemsSectionMarkup}
        </article>
      `;
  }

  return `
        <article class="card work-card">
          ${logoMarkup}
          <h3>${escapeHtml(cardItem.title)}</h3>
          <p>${escapeHtml(cardItem.body)}</p>
        </article>
      `;
}

/**
 * Renders the work quote callout and stacked work history cards.
 */
function renderWorkSection() {
  const workContentElement = getRequiredElement("work-content");
  const workQuote = appState.work.quote;
  const quoteText = workQuote?.text || "";
  const quotedBody = wrapWorkQuotedBody(quoteText);
  const quoteAuthor = workQuote?.author || "";
  const quoteMarkup = workQuote
    ? `<p class="quote">${escapeHtml(quotedBody)}</p>${quoteAuthor ? `<p class="quote-author"> ${escapeHtml(quoteAuthor)}</p>` : ""}`
    : "";

  const cardsMarkup = appState.work.cards.map((cardItem) => renderWorkCardMarkup(cardItem)).join("");

  workContentElement.innerHTML = `
    ${quoteMarkup}
    <div class="work-layout">${cardsMarkup}</div>
  `;
}

/**
 * Renders the adventures quote and photo grid cards.
 */
function renderAdventuresSection() {
  const adventuresContentElement = getRequiredElement("adventures-content");
  const adventuresQuote = appState.adventures.quote;
  const adventuresQuoteText = typeof adventuresQuote === "string" ? adventuresQuote : adventuresQuote?.text || "";
  const adventuresQuoteAuthor = typeof adventuresQuote === "string" ? "" : adventuresQuote?.author || "";

  const cardsMarkup = appState.adventures.cards
    .map(
      (cardItem) => {
        const objectPositionAttr =
          isSafeObjectPositionValue(cardItem.imageObjectPosition) && cardItem.imageObjectPosition
            ? ` style="object-position: ${escapeHtml(cardItem.imageObjectPosition.trim())}"`
            : "";

        return `
        <article class="adventure-card">
          <img src="${escapeHtml(cardItem.image)}" alt="${escapeHtml(cardItem.alt)}"${objectPositionAttr} />
          <div class="adventure-overlay">
            <h3 class="adventure-title">${escapeHtml(String(cardItem.title ?? ""))}</h3>
            <p class="adventure-subtext">${escapeHtml(cardItem.subtext)}</p>
          </div>
        </article>
      `;
      }
    )
    .join("");

  adventuresContentElement.innerHTML = `
    <p class="quote">${escapeHtml(adventuresQuoteText)}</p>
    ${adventuresQuoteAuthor ? `<p class="quote-author"> ${escapeHtml(adventuresQuoteAuthor)}</p>` : ""}
    <div class="adventure-grid">${cardsMarkup}</div>
  `;
}

/**
 * Builds the contact card markup for full tab or preview usage.
 */
function buildContactMarkup(includeForm) {
  const contactData = appState.contact;
  const incomingName = contactData.chatIncomingName || contactData.name;
  const incomingText = contactData.chatIncomingText || "Want to work together? Send me a message here.";
  const outgoingText = contactData.chatOutgoingText || "sounds good 🤙";
  const headerPhotoSrc = contactData.photo.src;
  const headerPhotoAlt = contactData.photo.alt;
  const headerName = contactData.chatIncomingName || contactData.name || "William";
  const headerLocation =
    typeof contactData.locationLine === "string" && contactData.locationLine.trim().length > 0
      ? contactData.locationLine.trim()
      : "New York, NY";
  const phoneHeaderMarkup = includeForm
    ? `
      <div class="contact-phone-header">
        <div class="contact-status-bar">
          <time id="contact-status-time" class="contact-status-time"></time>
          <div class="contact-status-indicators" aria-hidden="true">
            <div class="contact-signal-bars">
              <span class="contact-signal-bar"></span>
              <span class="contact-signal-bar"></span>
              <span class="contact-signal-bar"></span>
              <span class="contact-signal-bar"></span>
            </div>
            <div class="contact-battery" title="Battery">
              <span class="contact-battery-level"></span>
            </div>
          </div>
        </div>
        <div class="contact-profile-header">
          <img class="contact-profile-photo-large" src="${escapeHtml(headerPhotoSrc)}" alt="${escapeHtml(headerPhotoAlt)}" />
          <div class="contact-profile-pill">
            <div class="contact-profile-name-row">
              <span class="contact-profile-name">${escapeHtml(headerName)}</span>
              <span class="contact-profile-chevron">›</span>
            </div>
            <p class="contact-profile-location">${escapeHtml(headerLocation)}</p>
          </div>
        </div>
      </div>
    `
    : "";
  const formMarkup = includeForm
    ? `
      <form id="contact-form" class="contact-form contact-imessage-form" novalidate>
        <div class="contact-composer-row">
          <div class="contact-composer-icons">
            <a class="icon-link icon-link-flat" href="${escapeHtml(contactData.linkedinUrl)}" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
          </div>
          <label class="sr-only" for="contact-message">Message</label>
          <textarea id="contact-message" name="chatInput" rows="1" placeholder="iMessage" required></textarea>
          <button type="submit" class="contact-send-button" aria-label="Send message">↑</button>
        </div>
        <input id="contact-name" name="name" type="hidden" />
        <input id="contact-email" name="email" type="hidden" />
        <input id="contact-message-hidden" name="message" type="hidden" />
        <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />
        <p id="contact-form-message" class="contact-form-message" aria-live="polite"></p>
      </form>
    `
    : "";

  return `
    <article class="card contact-card">
      ${phoneHeaderMarkup}
      <div class="contact-chat-shell">
        <div ${includeForm ? 'id="contact-chat-thread"' : ""} class="contact-chat-thread">
          <div class="contact-bubble-row contact-bubble-row-incoming">
            <img class="contact-avatar" src="${escapeHtml(contactData.photo.src)}" alt="${escapeHtml(contactData.photo.alt)}" />
            <div>
              <p class="contact-chat-name">${escapeHtml(incomingName)}</p>
              <p class="contact-bubble contact-bubble-incoming">${escapeHtml(incomingText)}</p>
            </div>
          </div>
          <div class="contact-bubble-row contact-bubble-row-outgoing">
            <p class="contact-bubble contact-bubble-outgoing">${escapeHtml(outgoingText)}</p>
          </div>
        </div>
        ${formMarkup}
      </div>
    </article>
  `;
}

/**
 * Renders full contact tab content then wires form handling.
 */
function renderContactSections() {
  const fullContactElement = getRequiredElement("contact-content");

  fullContactElement.innerHTML = buildContactMarkup(true);
  initializeContactForm();
  startContactStatusClock();
}

/**
 * Updates the faux iOS status bar clock in 12-hour locale time and refreshes every minute.
 */
function startContactStatusClock() {
  const timeElement = document.getElementById("contact-status-time");
  if (!timeElement) {
    return;
  }

  /**
   * Writes the current time into the status bar element.
   */
  function updateContactStatusTime() {
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    timeElement.dateTime = now.toISOString();
  }

  updateContactStatusTime();
  window.setInterval(updateContactStatusTime, 60000);
}

// --- Contact form
/**
 * Validates contact form inputs and returns a clear message on errors.
 */
function validateContactInput(nameValue, emailValue, messageValue) {
  if (!nameValue.trim()) {
    return "Please enter your name.";
  }

  if (!emailValue.trim()) {
    return "Please enter your email.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailValue)) {
    return "Please enter a valid email address.";
  }

  if (!messageValue.trim()) {
    return "Please enter a message.";
  }

  return "";
}

/**
 * Handles contact form submission through the configured form endpoint.
 */
function initializeContactForm() {
  const formElement = document.getElementById("contact-form");
  const formMessageElement = document.getElementById("contact-form-message");
  const chatThreadElement = document.getElementById("contact-chat-thread");
  const messageInputElement = document.getElementById("contact-message");
  const nameFieldElement = document.getElementById("contact-name");
  const emailFieldElement = document.getElementById("contact-email");
  const hiddenMessageFieldElement = document.getElementById("contact-message-hidden");

  if (
    !formElement ||
    !formMessageElement ||
    !chatThreadElement ||
    !messageInputElement ||
    !nameFieldElement ||
    !emailFieldElement ||
    !hiddenMessageFieldElement
  ) {
    return;
  }

  const contactData = appState.contact;
  const promptNameText = "what's your name?";
  const promptTopicText = "nice to meet you :) what do you want to talk about?";
  const promptEmailText = "cool. what's your email?";
  const williamReplyDelayMs = 1000;

  const conversationState = {
    step: "idle",
    name: "",
    topic: "",
    email: ""
  };

  const sendSoundEffect = new Audio("assets/sounds/imessage-send.mp3");
  const receiveSoundEffect = new Audio("assets/sounds/imessage_recieve.mp3");
  sendSoundEffect.preload = "auto";
  receiveSoundEffect.preload = "auto";
  sendSoundEffect.volume = 0.2;
  receiveSoundEffect.volume = 0.9;
  let audioPrimed = false;

  function primeMessageAudio() {
    if (audioPrimed) {
      return;
    }
    audioPrimed = true;
    [sendSoundEffect, receiveSoundEffect].forEach((soundEffect) => {
      soundEffect.muted = true;
      const playPromise = soundEffect.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            soundEffect.pause();
            soundEffect.currentTime = 0;
            soundEffect.muted = false;
          })
          .catch(() => {
            soundEffect.muted = false;
          });
      } else {
        soundEffect.muted = false;
      }
    });
  }

  function playMessageTone(isOutgoingTone) {
    const sourceEffect = isOutgoingTone ? sendSoundEffect : receiveSoundEffect;
    const oneShotEffect = sourceEffect.cloneNode();
    oneShotEffect.volume = sourceEffect.volume;
    oneShotEffect.play().catch(() => {});
  }

  function appendIncomingBubble(textValue) {
    window.setTimeout(() => {
      const rowElement = document.createElement("div");
      rowElement.className = "contact-bubble-row contact-bubble-row-incoming contact-generated-row contact-bubble-enter";
      rowElement.innerHTML = `
        <img class="contact-avatar" src="${escapeHtml(contactData.photo.src)}" alt="${escapeHtml(contactData.photo.alt)}" />
        <div>
          <p class="contact-chat-name">${escapeHtml(contactData.chatIncomingName || contactData.name)}</p>
          <p class="contact-bubble contact-bubble-incoming">${escapeHtml(textValue)}</p>
        </div>
      `;
      chatThreadElement.appendChild(rowElement);
      requestAnimationFrame(() => rowElement.classList.add("is-visible"));
      playMessageTone(false);
      chatThreadElement.scrollTop = chatThreadElement.scrollHeight;
    }, williamReplyDelayMs);
  }

  function appendOutgoingBubble(textValue) {
    const rowElement = document.createElement("div");
    rowElement.className = "contact-bubble-row contact-bubble-row-outgoing contact-generated-row contact-bubble-enter";
    rowElement.innerHTML = `<p class="contact-bubble contact-bubble-outgoing">${escapeHtml(textValue)}</p>`;
    chatThreadElement.appendChild(rowElement);
    requestAnimationFrame(() => rowElement.classList.add("is-visible"));
    playMessageTone(true);
    chatThreadElement.scrollTop = chatThreadElement.scrollHeight;
  }

  function startConversation() {
    if (conversationState.step !== "idle") {
      return;
    }
    conversationState.step = "await_name";
    appendIncomingBubble(promptNameText);
  }

  function autoResizeComposer() {
    if (!messageInputElement.value.trim()) {
      messageInputElement.style.height = "28px";
      return;
    }
    messageInputElement.style.height = "auto";
    messageInputElement.style.height = `${messageInputElement.scrollHeight}px`;
  }

  autoResizeComposer();
  messageInputElement.addEventListener("focus", primeMessageAudio);
  messageInputElement.addEventListener("input", autoResizeComposer);
  messageInputElement.addEventListener("keydown", (keyboardEvent) => {
    primeMessageAudio();
    if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      formElement.requestSubmit();
    }
  });
  messageInputElement.addEventListener("focus", startConversation);
  messageInputElement.addEventListener("click", () => {
    primeMessageAudio();
    startConversation();
  });

  formElement.addEventListener("submit", async (submitEvent) => {
    submitEvent.preventDefault();
    formMessageElement.className = "contact-form-message";
    formMessageElement.textContent = "";

    if (conversationState.step === "idle") {
      startConversation();
      messageInputElement.focus();
      return;
    }

    const answerValue = messageInputElement.value.trim();
    if (!answerValue) {
      formMessageElement.classList.add("is-error");
      formMessageElement.textContent = "Please type a response before sending.";
      return;
    }

    if (conversationState.step === "await_email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(answerValue)) {
        formMessageElement.classList.add("is-error");
        formMessageElement.textContent = "Please enter a valid email address.";
        return;
      }
    }

    appendOutgoingBubble(answerValue);
    messageInputElement.value = "";
    autoResizeComposer();

    if (conversationState.step === "await_name") {
      conversationState.name = answerValue;
      conversationState.step = "await_topic";
      appendIncomingBubble(promptTopicText);
      return;
    }

    if (conversationState.step === "await_topic") {
      conversationState.topic = answerValue;
      conversationState.step = "await_email";
      appendIncomingBubble(promptEmailText);
      return;
    }

    conversationState.email = answerValue;
    nameFieldElement.value = conversationState.name;
    emailFieldElement.value = conversationState.email;
    hiddenMessageFieldElement.value = conversationState.topic;

    const validationError = validateContactInput(conversationState.name, conversationState.email, conversationState.topic);
    if (validationError) {
      formMessageElement.classList.add("is-error");
      formMessageElement.textContent = validationError;
      return;
    }

    try {
      const endpoint = appState.contact.formspreeEndpoint;
      const formData = new FormData(formElement);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Contact submit failed: ${response.status}`);
      }

      appendIncomingBubble("Delivered! If ur not a bot I'll get back to you :)");
      formElement.reset();
      autoResizeComposer();
      conversationState.step = "idle";
      conversationState.name = "";
      conversationState.topic = "";
      conversationState.email = "";
      formMessageElement.textContent = "";
    } catch (submitError) {
      console.error("Contact form submission failed.", {
        operation: "submitContactForm",
        input: { nameValue: conversationState.name, emailValue: conversationState.email },
        error: submitError instanceof Error ? submitError.message : String(submitError)
      });
      formMessageElement.classList.add("is-error");
      formMessageElement.textContent = "Sorry, something went wrong. Please email me directly.";
    }
  });
}

// --- Bootstrap
/**
 * Loads data and renders the entire site experience.
 */
async function initializeSite() {
  try {
    initializeTabs();

    const [profileData, workData, nowData, adventuresData, contactData] = await Promise.all([
      loadJsonFile(DATA_FILES.profile),
      loadJsonFile(DATA_FILES.work),
      loadJsonFile(DATA_FILES.now),
      loadJsonFile(DATA_FILES.adventures),
      loadJsonFile(DATA_FILES.contact)
    ]);

    appState.profile = profileData;
    appState.work = workData;
    appState.now = nowData;
    appState.adventures = adventuresData;
    appState.contact = contactData;

    renderProfileSection();
    renderNowSection();
    renderWorkSection();
    renderAdventuresSection();
    renderContactSections();
  } catch (initializationError) {
    console.error("Site initialization failed.", {
      operation: "initializeSite",
      error: initializationError instanceof Error ? initializationError.message : String(initializationError)
    });
    document.body.innerHTML = `
      <main class="site-shell">
        <article class="card">
          <h1>Something went wrong loading the site.</h1>
          <p>Please refresh the page. If the issue persists, check the console for details.</p>
        </article>
      </main>
    `;
  }
}

initializeSite();
