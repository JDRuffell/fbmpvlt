// ==UserScript== or extension content script

// 1. Constants and configuration


// 2. Utility functions
// Returns true if inline placement succeeded, false otherwise
function placeCopyBtnNextToShareBtn(shareBtn, newBtn) {
  // Traverse up to 5 ancestors to find a flex parent
  let current = shareBtn;
  for (let i = 0; i < 5; i++) {
    const parent = current.parentElement;
    if (!parent) break;
    if (window.getComputedStyle(parent).display === "flex") {
      newBtn.classList.add("fb-copy-svg-btn-inline");
      parent.insertBefore(newBtn, current);
    }
    current = parent;
  }
}

function getLargestVisibleMedia() {
  console.log("[FB Helper] Searching for largest visible media (video or image)...");

  const candidates = [...document.querySelectorAll('video[src], img[src*="scontent"]')];
  let bestMedia = null;
  let maxVisibleArea = 0;

  candidates.forEach(media => {
    const rect = media.getBoundingClientRect();

    // Calculate visible width and height within viewport
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const visibleArea = visibleWidth * visibleHeight;

    console.log(`[FB Helper] Media ${media.tagName} src: ${media.src}, visible area: ${visibleArea}`);

    if (visibleArea > maxVisibleArea) {
      maxVisibleArea = visibleArea;
      bestMedia = media;
    }
  });

  if (bestMedia) {
    console.log(`[FB Helper] Selected media: ${bestMedia.tagName} src: ${bestMedia.src} with area: ${maxVisibleArea}`);
    return { type: bestMedia.tagName.toLowerCase(), src: bestMedia.src };
  } else {
    console.warn("[FB Helper] No visible media found.");
    return null;
  }
}

// 3. Core logic functions
// Create the floating copy button with clipboard functionality
function createButton(shareBtn) {
  console.log("[FB Helper] Creating copy button...");

  // Create the button element
  const button = document.createElement("button");
  button.className = "fb-copy-button";
  button.type = "button";
  button.setAttribute("title", "Copy Marketplace Link");
  button.onclick = () => {
    console.log("[FB Helper] Copy button clicked.");
    button.disabled = true;

    const media = getLargestVisibleMedia();

    if (!media) {
      console.warn("[FB Helper] No visible media found to copy.");
      button.disabled = false;
      return;
    }

    // Strip the URL to the base marketplace item URL
    let url = location.href;
    const match = url.match(/^(https:\/\/www\.facebook\.com\/marketplace\/item\/\d+\/)/);
    const baseUrl = match ? match[1] : url;

    let text = `<${baseUrl}>\n-# [Media](${media.src})`;

    navigator.clipboard.writeText(text).then(() => {
      console.log("[FB Helper] Text copied to clipboard:", text);
      button.disabled = false;
    });
  };

  if (!shareBtn) {
    // Fallback and create a floating button
    document.body.appendChild(button);
    button.classList.add("fb-copy-button-floating");
    console.log("[FB Helper] Button added to the page (floating)");  
  } else {
    // Create the button inline with the Share button
    placeCopyBtnNextToShareBtn(shareBtn, button)
    console.log("[FB Helper] Button added to the page (inline)");
  }

  console.log("[FB Helper] Copy button created");
}

//
function observeForShareBtn(callback) {
  let found = false;
  let element;

  // Create a timeout before the observer
  const timeoutId = setTimeout(() => {
    if (!found) {
      console.log("[FB Helper] Share button not found within timeout.");
      observer.disconnect();
      callback(null); // Not found
    }
  }, 1000);
  
  const observer = new MutationObserver(() => {
    element = document.querySelector('div[aria-label="Share"]');
    if (element) {
      console.log("[FB Helper] Share button found.");
      found = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      callback(element);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


// 4. Event handler functions
// Main logic to add/remove button based on URL
function onPageChange() {
  const isListingPage = location.href.includes("/marketplace/item/");
  // maybe add a way to detect if its floating or not and re-do the addition if its added but floating?
  const existingButton = document.querySelector(".fb-copy-button");

  console.log(`[FB Helper] onPageChange triggered. isListingPage: ${isListingPage}, buttonExists: ${!!existingButton}`);

  if (isListingPage && !existingButton) {
    console.log("[FB Helper] Waiting for Message button...");
    const callback = (shareBtn) => {
      createButton(shareBtn);
    };
    observeForShareBtn(callback);
  } else if (!isListingPage && existingButton) {
    console.log("[FB Helper] Removing existing copy button...");
    existingButton.remove();
  } else {
    console.log("[FB Helper] No action needed onPageChange.");
  }
}


// 5. Initialization/setup
function init() {
  console.log("[FB Helper] Initializing content script...");

  initUrlChangeListeners();

  console.log("[FB Helper] Initialization complete.");
}

// Initializes listeners for url changes
function initUrlChangeListeners() {
  console.log("[FB Helper] Initializing URL change listeners...");

  // Monkey-patch for methods that change the URL
  // TODO These dont seem to be working, perhaps its being injected to early?
  ['pushState', 'replaceState'].forEach(function (method) {
    // Copy the original method
    const original = history[method];
    // Patch it to to call our function but perserve the original output
    history[method] = function () {
      console.log("[FB Helper] URL change detected via", method);
      onPageChange();
      return original.apply(this, arguments);
    };
  });

  // Listen for navigation events that change the URL
  window.addEventListener('popstate', function () {
    console.log("[FB Helper] URL change detected via popstate");
    onPageChange();
  });

  console.log("[FB Helper] URL change listeners initialized.");

  onPageChange(); // Initial call to set up the button if needed
}

// 6. Initial setup call
init();













