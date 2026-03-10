chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    const navigationStarted = changeInfo.status === 'loading' || typeof changeInfo.url === 'string';
    if (!navigationStarted) {
        return;
    }

    chrome.storage.local.get('modeByTab', function (result) {
        const modeByTab = result.modeByTab || {};

        if (!(tabId in modeByTab)) {
            return;
        }

        delete modeByTab[tabId];
        chrome.storage.local.set({ modeByTab });
    });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
    chrome.storage.local.get('modeByTab', function (result) {
        const modeByTab = result.modeByTab || {};

        if (!(tabId in modeByTab)) {
            return;
        }

        delete modeByTab[tabId];
        chrome.storage.local.set({ modeByTab });
    });
});
