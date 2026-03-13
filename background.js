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

async function fetchImageMetadata(url) {
    const attempts = [
        { method: 'HEAD', options: {} },
        { method: 'GET', options: { headers: { Range: 'bytes=0-0' } } },
        { method: 'GET', options: {} }
    ];

    for (const attempt of attempts) {
        try {
            const response = await fetch(url, {
                method: attempt.method,
                cache: 'force-cache',
                ...attempt.options
            });

            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || null;
            const contentLength = response.headers.get('content-length');
            const contentRange = response.headers.get('content-range') || '';

            let byteLength = Number(contentLength);
            if (!Number.isFinite(byteLength) || byteLength < 0) {
                const totalMatch = contentRange.match(/\/(\d+)$/);
                if (totalMatch) {
                    byteLength = Number(totalMatch[1]);
                }
            }

            if ((!Number.isFinite(byteLength) || byteLength < 0) && attempt.method === 'GET') {
                const buffer = await response.clone().arrayBuffer();
                byteLength = buffer.byteLength;
            }

            return {
                ok: true,
                mimeType: contentType ? contentType.split(';')[0].trim() : null,
                byteLength: Number.isFinite(byteLength) && byteLength >= 0 ? byteLength : null
            };
        } catch (error) {
            // Continue trying the next strategy.
        }
    }

    return { ok: false, mimeType: null, byteLength: null };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'fetchImageMetadata' || typeof message.url !== 'string') {
        return;
    }

    fetchImageMetadata(message.url)
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ ok: false, mimeType: null, byteLength: null }));

    return true;
});
