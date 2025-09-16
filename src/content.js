// Detects "Member-only story" and redirects to freedium.cfd keeping the full URL
// Rules:
// - Runs only on whitelisted domains (configurable via popup UI)
// - Avoids loops using a URL flag (query param)
// - Observes dynamic loading (MutationObserver)
// - Performs only one attempt per page

(function () {
  const REDIRECT_FLAG = "freedium-redirected";
  let redirectAttempted = false;
  let whitelistDomains = ['medium.com', 'infosecwriteups.com']; // Default fallback

  function isAlreadyRedirected() {
    const url = new URL(window.location.href);
    return url.searchParams.get(REDIRECT_FLAG) === "1";
  }

  function isMemberOnlyPresent(root) {
    // 1) Look for visible exact text
    const memberTextSelector = 'p, span, div, h1, h2, h3, h4, h5, h6';
    const nodes = root.querySelectorAll(memberTextSelector);
    for (const node of nodes) {
      // Micro-optimization: quick checks before toLowerCase
      if (!node || !node.textContent) continue;
      const text = node.textContent.trim();
      if (text.length < 6) continue; // micro-optimization
      const lower = text.toLowerCase();
      if (lower.includes("member-only story") || lower.includes("member‑only story")) {
        return true;
      }
    }

    // 2) Fallback scanning generic <p> tags (classes vary across Medium skins)
    const badges = root.querySelectorAll('p');
    for (const badge of badges) {
      const txt = (badge.textContent || '').toLowerCase();
      if (txt.includes("member-only story") || txt.includes("member‑only story")) {
        return true;
      }
    }

    return false;
  }

  function buildFreediumUrl(mediumUrl) {
    // Builds: https://freedium.cfd/<FULL-ORIGINAL-URL>
    // Keeps protocol/host/path/query/hash as part of the path
    // Example: https://freedium.cfd/https://medium.com/@user/post?x=1#y
    const encoded = mediumUrl;
    return `https://freedium.cfd/${encoded}`;
  }

  function redirectToFreedium() {
    if (redirectAttempted) return;
    redirectAttempted = true;

    if (isAlreadyRedirected()) return;

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set(REDIRECT_FLAG, "1");
      const flaggedUrl = currentUrl.toString();

      const target = buildFreediumUrl(flaggedUrl);
      // Use location.replace to avoid polluting history
      window.location.replace(target);
    } catch (e) {
      // Silent catch to avoid breaking the page
    }
  }

  function isDomainWhitelisted() {
    const hostname = window.location.hostname.toLowerCase();
    return whitelistDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      return hostname === domainLower || hostname.endsWith('.' + domainLower);
    });
  }

  function checkAndRedirect(root = document) {
    if (redirectAttempted || isAlreadyRedirected()) return;
    if (!isDomainWhitelisted()) return;
    if (isMemberOnlyPresent(root)) {
      redirectToFreedium();
    }
  }

  // Load whitelist from storage
  function loadWhitelist() {
    chrome.storage.sync.get(['whitelistDomains'], function(result) {
      if (result.whitelistDomains) {
        whitelistDomains = result.whitelistDomains;
      }
      // Run initial check after loading whitelist
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => checkAndRedirect());
      } else {
        checkAndRedirect();
      }
    });
  }

  // Listen for whitelist updates from background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateWhitelist') {
      whitelistDomains = request.whitelist || ['medium.com', 'infosecwriteups.com'];
    }
  });

  // Load whitelist and start
  loadWhitelist();

  // Observe dynamic mutations (Medium behaves as a SPA)
  const observer = new MutationObserver((mutations) => {
    if (redirectAttempted) return;
    for (const m of mutations) {
      for (const node of m.addedNodes || []) {
        if (!(node instanceof HTMLElement)) continue;
        checkAndRedirect(node);
        if (redirectAttempted) break;
      }
      if (redirectAttempted) break;
    }
  });

  try {
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch (_) {
    // ignore
  }
})();


