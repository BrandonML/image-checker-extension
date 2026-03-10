document.addEventListener('DOMContentLoaded', function () {
    const status = document.getElementById('status');
    const filterControls = document.getElementById('filter-controls');
    const imageTypesContainer = document.getElementById('image-types');
    const minSizeInput = document.getElementById('min-size');

    // Restore saved settings
    chrome.storage.local.get(['modeByTab', 'filterSettings'], function (result) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTabId = tabs[0].id;
            const modeByTab = result.modeByTab || {};
            const mode = modeByTab[currentTabId] || 'off';

            document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
            updateStatus(mode);

            if (mode === 'all') {
                filterControls.style.display = 'block';
                populateImageTypes();
            }

            // Restore filter settings
            if (result.filterSettings) {
                minSizeInput.value = result.filterSettings.minSize || 0;
            }
        });
    });

    // Add event listeners to mode selectors
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const mode = this.value;
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentTabId = tabs[0].id;

                chrome.storage.local.get('modeByTab', function (result) {
                    const modeByTab = result.modeByTab || {};
                    modeByTab[currentTabId] = mode;
                    chrome.storage.local.set({ modeByTab });
                });

                updateStatus(mode);
                applyMode(mode);

                if (mode === 'all') {
                    filterControls.style.display = 'block';
                    populateImageTypes();
                } else {
                    filterControls.style.display = 'none';
                }
            });
        });
    });

    // Event listener for filter changes
    minSizeInput.addEventListener('change', saveFilterSettings);
    imageTypesContainer.addEventListener('change', saveFilterSettings);


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

    async function populateImageTypes() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getImageTypes,
        }, (injectionResults) => {
            const imageTypes = injectionResults[0].result;
            imageTypesContainer.innerHTML = ''; // Clear existing checkboxes

            if (imageTypes && imageTypes.length > 0) {
                chrome.storage.local.get('filterSettings', function (result) {
                    const savedTypes = result.filterSettings ? result.filterSettings.allowedTypes : imageTypes;

                    imageTypes.forEach(type => {
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `type-${type}`;
                        checkbox.value = type;
                        checkbox.checked = savedTypes.includes(type);

                        const label = document.createElement('label');
                        label.htmlFor = `type-${type}`;
                        label.textContent = type.toUpperCase();
                        label.style.marginLeft = '5px';

                        const container = document.createElement('div');
                        container.appendChild(checkbox);
                        container.appendChild(label);
                        imageTypesContainer.appendChild(container);
                    });
                });
            } else {
                imageTypesContainer.textContent = 'No image types found on this page.';
            }
        });
    }

    function saveFilterSettings() {
        const allowedTypes = Array.from(imageTypesContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const minSize = parseInt(minSizeInput.value, 10) || 0;

        const filterSettings = { allowedTypes, minSize };
        chrome.storage.local.set({ filterSettings }, function () {
            // Re-apply the 'all' mode to reflect filter changes
            applyMode('all');
        });
    }

    // This function is injected into the page to get all unique image types
    function getImageTypes() {
        const images = document.querySelectorAll('img');
        const types = new Set();
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif', '.bmp', '.ico'];

        images.forEach(img => {
            const src = img.getAttribute('src') || '';
            const baseUrl = src.split('?')[0].split('#')[0];
            const extensionMatch = baseUrl.match(/\.([a-zA-Z0-9]+)$/);

            if (extensionMatch && validExtensions.includes(extensionMatch[0].toLowerCase())) {
                types.add(extensionMatch[1].toLowerCase());
            } else if (src.startsWith('data:image/')) {
                const mimeType = src.match(/data:image\/([^;]+);/);
                if (mimeType) {
                    types.add(mimeType[1]);
                }
            }
        });

        return Array.from(types);
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
