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
