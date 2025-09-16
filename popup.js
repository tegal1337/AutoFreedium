// Popup UI for managing whitelist domains
document.addEventListener('DOMContentLoaded', function() {
  const domainList = document.getElementById('domainList');
  const domainInput = document.getElementById('domainInput');
  const addBtn = document.getElementById('addBtn');
  const status = document.getElementById('status');

  // Load current whitelist
  loadWhitelist();

  // Add domain button handler
  addBtn.addEventListener('click', addDomain);

  // Enter key handler
  domainInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addDomain();
    }
  });

  // Input validation
  domainInput.addEventListener('input', function() {
    const domain = domainInput.value.trim();
    addBtn.disabled = !isValidDomain(domain) || isDuplicateDomain(domain);
  });

  function loadWhitelist() {
    chrome.storage.sync.get(['whitelistDomains'], function(result) {
      const domains = result.whitelistDomains || ['medium.com', 'infosecwriteups.com'];
      renderDomainList(domains);
    });
  }

  function renderDomainList(domains) {
    domainList.innerHTML = '';
    
    if (domains.length === 0) {
      domainList.innerHTML = '<div class="domain-item" style="color: #6c757d; font-style: italic;">No domains added</div>';
      return;
    }

    domains.forEach(domain => {
      const domainItem = document.createElement('div');
      domainItem.className = 'domain-item';
      
      domainItem.innerHTML = `
        <div class="domain-text">${domain}</div>
        <button class="remove-btn" data-domain="${domain}">Remove</button>
      `;
      
      domainItem.querySelector('.remove-btn').addEventListener('click', function() {
        removeDomain(domain);
      });
      
      domainList.appendChild(domainItem);
    });
  }

  function addDomain() {
    const domain = domainInput.value.trim();
    
    if (!isValidDomain(domain)) {
      showStatus('Please enter a valid domain (e.g., medium.com)', 'error');
      return;
    }

    if (isDuplicateDomain(domain)) {
      showStatus('Domain already exists in whitelist', 'error');
      return;
    }

    chrome.storage.sync.get(['whitelistDomains'], function(result) {
      const domains = result.whitelistDomains || ['medium.com', 'infosecwriteups.com'];
      domains.push(domain);
      
      chrome.storage.sync.set({ whitelistDomains: domains }, function() {
        domainInput.value = '';
        addBtn.disabled = true;
        renderDomainList(domains);
        showStatus(`Added ${domain} to whitelist`, 'success');
      });
    });
  }

  function removeDomain(domain) {
    chrome.storage.sync.get(['whitelistDomains'], function(result) {
      const domains = result.whitelistDomains || ['medium.com', 'infosecwriteups.com'];
      const filteredDomains = domains.filter(d => d !== domain);
      
      chrome.storage.sync.set({ whitelistDomains: filteredDomains }, function() {
        renderDomainList(filteredDomains);
        showStatus(`Removed ${domain} from whitelist`, 'success');
      });
    });
  }

  function isValidDomain(domain) {
    if (!domain || domain.length < 3) return false;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  function isDuplicateDomain(domain) {
    const existingDomains = Array.from(domainList.querySelectorAll('.domain-text'))
      .map(el => el.textContent.trim());
    return existingDomains.includes(domain);
  }

  function showStatus(message, type) {
    status.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
      status.innerHTML = '';
    }, 3000);
  }
});
