document.addEventListener('DOMContentLoaded', function () {
    const status = document.getElementById('status');

    // Restore the saved mode
    function restoreMode() {
        chrome.storage.local.get(['mode', 'tabId'], function (result) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentTabId = tabs[0].id;
                if (result.tabId === currentTabId) {
                    const mode = result.mode || 'off';
                    document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
                    updateStatus(mode);
                } else {
                    document.querySelector('input[name="mode"][value="off"]').checked = true;
                    updateStatus('off');
                }
            });
        });
    }

    restoreMode();

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.message === 'update_ui') {
            restoreMode();
        }
    });

    // Add event listeners to mode selectors
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const mode = this.value;
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentTabId = tabs[0].id;
                chrome.storage.local.set({ mode: mode, tabId: currentTabId });
                updateStatus(mode);
                applyMode(mode);
            });
        });
    });

    function updateStatus(mode) {
        switch (mode) {
            case 'inspector':
                status.textContent = 'Inspector mode is active.';
                break;
            case 'all':
                status.textContent = 'Showing details for all images.';
                break;
            default:
                status.textContent = 'Select a mode to begin.';
                break;
        }
    }

    async function applyMode(mode) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Always disable the current mode before enabling a new one.
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: disableInspectorMode,
        });

        if (mode === 'inspector') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['inspectorMode.js'],
            });
        } else if (mode === 'all') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['imageDetails.js'],
            });
        }
    }
});

// This function can be injected into the page to clear details
function clearImageDetails() {
    const overlays = document.querySelectorAll('.image-details-overlay');
    overlays.forEach(overlay => overlay.remove());
}

// Function to disable inspector mode on the page
function disableInspectorMode() {
    // Remove any existing overlays
    const overlays = document.querySelectorAll('.image-details-overlay');
    overlays.forEach(overlay => overlay.remove());

    // Remove event listeners
    document.querySelectorAll('img').forEach(img => {
        img.style.cursor = '';
        img.classList.remove('image-inspector-hover');
        img.removeEventListener('click', window.imageInspectorClickHandler);
        img.removeEventListener('mouseover', window.imageInspectorHoverHandler);
        img.removeEventListener('mouseout', window.imageInspectorOutHandler);
    });

    // Remove global click handler
    if (window.documentClickHandler) {
        document.removeEventListener('click', window.documentClickHandler);
    }

    // Remove styles
    const styleElement = document.getElementById('image-inspector-styles');
    if (styleElement) styleElement.remove();
}