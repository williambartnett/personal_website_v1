/*
This file loads JSON content and renders all site sections.
It is called by index.html and controls tab switching and contact form submission.
CHANGED: Updated media panes to show multi-item native-style lists.
CHANGED: Work tab supports optional item lists with linked titles and subtext.
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
  profileSlideTimer: null
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
  const profilePhotoElement = getRequiredElement("profile-photo");

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
  profilePhotoElement.alt = profileData.profilePhoto.alt;
  initializeProfileSlideshow();
}

/**
 * Rotates the headshot image every 7 seconds with a left slide.
 */
function initializeProfileSlideshow() {
  const profilePhotoCardElement = getRequiredElement("profile-photo-card");
  const profilePhotoElement = getRequiredElement("profile-photo");
  const profilePhotoNextElement = getRequiredElement("profile-photo-next");
  const slideshowPhotos = appState.profile.profileSlideshowPhotos || [appState.profile.profilePhoto.src];

  if (appState.profileSlideTimer) {
    clearInterval(appState.profileSlideTimer);
  }

  appState.profileSlideIndex = 0;
  profilePhotoElement.src = slideshowPhotos[0];
  profilePhotoNextElement.src = slideshowPhotos[1 % slideshowPhotos.length];
  profilePhotoElement.alt = appState.profile.profilePhoto.alt;
  profilePhotoNextElement.alt = appState.profile.profilePhoto.alt;

  if (slideshowPhotos.length <= 1) {
    return;
  }

  let slideInProgress = false;
  profilePhotoCardElement.addEventListener("transitionend", () => {
    if (!slideInProgress) {
      return;
    }

    slideInProgress = false;
    profilePhotoElement.src = slideshowPhotos[appState.profileSlideIndex];
    const nextIndex = (appState.profileSlideIndex + 1) % slideshowPhotos.length;
    profilePhotoNextElement.src = slideshowPhotos[nextIndex];
    profilePhotoCardElement.classList.add("no-slide-transition");
    profilePhotoCardElement.classList.remove("is-sliding");
    // Force reflow so position reset happens instantly with no reverse animation.
    void profilePhotoCardElement.offsetWidth;
    profilePhotoCardElement.classList.remove("no-slide-transition");
  });

  appState.profileSlideTimer = window.setInterval(() => {
    if (slideInProgress) {
      return;
    }

    appState.profileSlideIndex = (appState.profileSlideIndex + 1) % slideshowPhotos.length;
    slideInProgress = true;
    profilePhotoCardElement.classList.add("is-sliding");
  }, 7000);
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
    beli: ["assets/images/media/beli-thumb-1.png", "assets/images/media/beli-thumb-2.png", "assets/images/media/beli-thumb-3.png"],
    goodreads: [
      "assets/images/media/goodreads-cover-1.png",
      "assets/images/media/goodreads-cover-2.png",
      "assets/images/media/goodreads-cover-3.png",
      "assets/images/media/goodreads-cover-4.png",
      "assets/images/media/goodreads-cover-5.png",
      "assets/images/media/goodreads-cover-6.png",
      "assets/images/media/goodreads-cover-7.png"
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
        (item) => `
          <a class="spotify-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.thumbnailAlt)}" />
            <div>
              <p class="spotify-title">${escapeHtml(item.primaryText)}</p>
              <p class="spotify-artist">${escapeHtml(item.secondaryText)}</p>
            </div>
          </a>
        `
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
}

/**
 * Renders one work history card: plain body or a list of linked titles with description subtext.
 */
/**
 * Renders one work history card: plain body or a list of linked titles with description subtext.
 */
function renderWorkCardMarkup(cardItem) {
  const hasItems = Array.isArray(cardItem.items) && cardItem.items.length > 0;

  if (hasItems) {
    const itemsMarkup = cardItem.items
      .map(
        (item) => `
        <div class="work-card-item">
          <a class="work-card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          <p class="work-card-item-sub">${escapeHtml(item.description)}</p>
        </div>
      `
      )
      .join("");

    return `
        <article class="card work-card">
          <h3>${escapeHtml(cardItem.title)}</h3>
          <div class="work-card-items">${itemsMarkup}</div>
        </article>
      `;
  }

  return `
        <article class="card work-card">
          <h3>${escapeHtml(cardItem.title)}</h3>
          <p>${escapeHtml(cardItem.body)}</p>
        </article>
      `;
}

/**
 * Renders the work quote and stacked work history cards.
 */
function renderWorkSection() {
  const workContentElement = getRequiredElement("work-content");

  const cardsMarkup = appState.work.cards.map((cardItem) => renderWorkCardMarkup(cardItem)).join("");

  workContentElement.innerHTML = `
    <p class="quote">${escapeHtml(appState.work.quote.text)}</p>
    <p class="quote-author">- ${escapeHtml(appState.work.quote.author)}</p>
    <div class="work-layout">${cardsMarkup}</div>
  `;
}

/**
 * Renders the adventures quote and photo grid cards.
 */
function renderAdventuresSection() {
  const adventuresContentElement = getRequiredElement("adventures-content");

  const cardsMarkup = appState.adventures.cards
    .map(
      (cardItem) => `
        <article class="adventure-card">
          <img src="${escapeHtml(cardItem.image)}" alt="${escapeHtml(cardItem.alt)}" />
          <div class="adventure-overlay">
            <h3 class="adventure-title">${escapeHtml(String(cardItem.title ?? ""))}</h3>
            <p class="adventure-subtext">${escapeHtml(cardItem.subtext)}</p>
          </div>
        </article>
      `
    )
    .join("");

  adventuresContentElement.innerHTML = `
    <p class="quote">${escapeHtml(appState.adventures.quote)}</p>
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
 * Renders contact preview and full contact tab then wires form handling.
 */
function renderContactSections() {
  const previewElement = getRequiredElement("contact-preview");
  const fullContactElement = getRequiredElement("contact-content");

  previewElement.innerHTML = buildContactMarkup(false);
  fullContactElement.innerHTML = buildContactMarkup(true);
  initializeContactForm();
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
      formMessageElement.classList.add("is-success");
      formMessageElement.textContent = "Thanks - your message was sent.";
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
