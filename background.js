// Background script for settings management and dynamic whitelist
chrome.runtime.onInstalled.addListener(function() {
  // Set default whitelist domains
  chrome.storage.sync.get(['whitelistDomains'], function(result) {
    if (!result.whitelistDomains) {
      chrome.storage.sync.set({
        whitelistDomains: ['medium.com', 'infosecwriteups.com']
      });
    }
  });
});

// Listen for whitelist changes and update content scripts
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.whitelistDomains) {
    // Notify all tabs to update their whitelist
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateWhitelist',
          whitelist: changes.whitelistDomains.newValue
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
});
