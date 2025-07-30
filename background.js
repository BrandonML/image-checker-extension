chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.storage.local.get(['tabId'], function (result) {
            if (result.tabId !== tabId) {
                chrome.storage.local.set({ mode: 'off', tabId: tabId });
            }
        });
    }
});
