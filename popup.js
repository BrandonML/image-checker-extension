document.addEventListener('DOMContentLoaded', function () {
    const status = document.getElementById('status');
    const filterControls = document.getElementById('filter-controls');
    const imageTypesContainer = document.getElementById('image-types');
    const minSizeInput = document.getElementById('min-size');

    const SUPPORTED_IMAGE_TYPES = new Set(['jpeg', 'png', 'webp', 'svg', 'heif', 'heic', 'gif', 'avif', 'bmp', 'ico']);
    const IMAGE_TYPE_ALIASES = {
        jpg: 'jpeg',
        'svg+xml': 'svg',
        'x-icon': 'ico',
        'vnd.microsoft.icon': 'ico'
    };

    function normalizeImageType(type) {
        if (!type) return null;

        const normalized = type.toLowerCase();
        const mappedType = IMAGE_TYPE_ALIASES[normalized] || normalized;

        return SUPPORTED_IMAGE_TYPES.has(mappedType) ? mappedType : null;
    }

    function setStatusMessage(message, isError = false) {
        status.textContent = message;
        status.style.color = isError ? '#b91c1c' : '';
    }

    async function getActiveTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0] || null;
    }

    function executeScriptSafe(options) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript(options, (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(results || []);
            });
        });
    }

    // Restore saved settings
    chrome.storage.local.get(['modeByTab', 'filterSettings'], function (result) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) {
                setStatusMessage('No active tab found.', true);
                return;
            }

            const currentTabId = tabs[0].id;
            const modeByTab = result.modeByTab || {};
            const mode = modeByTab[currentTabId] || 'off';

            const modeInput = document.querySelector(`input[name="mode"][value="${mode}"]`);
            if (modeInput) {
                modeInput.checked = true;
            }
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
        radio.addEventListener('change', async function () {
            const mode = this.value;
            const tab = await getActiveTab();

            if (!tab) {
                setStatusMessage('No active tab found.', true);
                return;
            }

            const modeApplied = await applyMode(mode, tab.id);
            if (!modeApplied) {
                return;
            }

            chrome.storage.local.get('modeByTab', function (result) {
                const modeByTab = result.modeByTab || {};
                modeByTab[tab.id] = mode;
                chrome.storage.local.set({ modeByTab });
            });

            if (mode === 'all') {
                filterControls.style.display = 'block';
                populateImageTypes();
            } else {
                filterControls.style.display = 'none';
            }
        });
    });

    // Event listener for filter changes
    minSizeInput.addEventListener('change', saveFilterSettings);
    imageTypesContainer.addEventListener('change', saveFilterSettings);


    function updateStatus(mode) {
        switch (mode) {
            case 'inspector':
                setStatusMessage('Inspector mode is active.');
                break;
            case 'all':
                setStatusMessage('Showing details for all images.');
                break;
            default:
                setStatusMessage('Select a mode to begin.');
                break;
        }
    }

    async function applyMode(mode, tabId) {
        const activeTabId = tabId || (await getActiveTab())?.id;
        if (!activeTabId) {
            setStatusMessage('Unable to detect active tab.', true);
            return false;
        }

        try {
            // Always disable the current mode before enabling a new one.
            await executeScriptSafe({
                target: { tabId: activeTabId },
                function: disableInspectorMode,
            });

            if (mode === 'inspector') {
                await executeScriptSafe({
                    target: { tabId: activeTabId },
                    files: ['inspectorMode.js'],
                });
            } else if (mode === 'all') {
                await executeScriptSafe({
                    target: { tabId: activeTabId },
                    files: ['imageDetails.js'],
                });
            }

            updateStatus(mode);
            return true;
        } catch (error) {
            setStatusMessage(`Cannot run on this page: ${error.message}`, true);
            return false;
        }
    }

    async function populateImageTypes() {
        const tab = await getActiveTab();
        if (!tab) {
            imageTypesContainer.textContent = 'No active tab found.';
            return;
        }

        try {
            const injectionResults = await executeScriptSafe({
                target: { tabId: tab.id },
                function: getImageTypes,
            });

            const imageTypes = injectionResults[0] ? injectionResults[0].result : [];
            imageTypesContainer.innerHTML = ''; // Clear existing checkboxes

            if (imageTypes && imageTypes.length > 0) {
                chrome.storage.local.get('filterSettings', function (result) {
                    const savedTypes = result.filterSettings
                        ? (result.filterSettings.allowedTypes || []).map(normalizeImageType).filter(Boolean)
                        : imageTypes;

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
        } catch (error) {
            imageTypesContainer.textContent = `Cannot inspect image types on this page: ${error.message}`;
        }
    }

    function saveFilterSettings() {
        const allowedTypes = Array.from(imageTypesContainer.querySelectorAll('input:checked'))
            .map(cb => normalizeImageType(cb.value))
            .filter(Boolean);
        const minSize = parseInt(minSizeInput.value, 10) || 0;

        const filterSettings = { allowedTypes, minSize };
        chrome.storage.local.set({ filterSettings }, async function () {
            // Re-apply filters only when show-all mode is active for this tab.
            const tab = await getActiveTab();
            if (!tab) return;

            chrome.storage.local.get('modeByTab', function (result) {
                const modeByTab = result.modeByTab || {};
                if (modeByTab[tab.id] === 'all') {
                    applyMode('all', tab.id);
                }
            });
        });
    }

    // This function is injected into the page to get all unique image types
    function getImageTypes() {
        const SUPPORTED_IMAGE_TYPES = new Set(['jpeg', 'png', 'webp', 'svg', 'heif', 'heic', 'gif', 'avif', 'bmp', 'ico']);
        const IMAGE_TYPE_ALIASES = {
            jpg: 'jpeg',
            'svg+xml': 'svg',
            'x-icon': 'ico',
            'vnd.microsoft.icon': 'ico'
        };

        function normalizeImageType(type) {
            if (!type) return null;

            const normalized = type.toLowerCase();
            const mappedType = IMAGE_TYPE_ALIASES[normalized] || normalized;

            return SUPPORTED_IMAGE_TYPES.has(mappedType) ? mappedType : null;
        }

        function getNormalizedImageType(src) {
            if (!src) return null;

            const baseUrl = src.split('?')[0].split('#')[0];
            const extensionMatch = baseUrl.match(/\.([a-zA-Z0-9+.-]+)$/);

            if (extensionMatch) {
                return normalizeImageType(extensionMatch[1]);
            }

            const dataUrlMatch = src.match(/^data:image\/([^;,]+)/i);
            if (dataUrlMatch) {
                return normalizeImageType(dataUrlMatch[1]);
            }

            return null;
        }

        function getCandidateSourceFromSrcset(srcset) {
            if (!srcset) return '';

            const firstCandidate = srcset
                .split(',')
                .map((candidate) => candidate.trim())
                .find(Boolean);

            if (!firstCandidate) return '';

            const [candidateUrl] = firstCandidate.split(/\s+/, 1);
            return candidateUrl || '';
        }

        function getImageSource(img) {
            return img.currentSrc || img.getAttribute('src') || getCandidateSourceFromSrcset(img.getAttribute('srcset') || '') || '';
        }

        const images = document.querySelectorAll('img');
        const types = new Set();

        images.forEach(img => {
            const imageType = getNormalizedImageType(getImageSource(img));

            if (imageType) {
                types.add(imageType);
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

    // Disconnect mode observers to avoid duplicate observers/listeners on mode switches.
    if (window.imageInspectorObserver) {
        window.imageInspectorObserver.disconnect();
        window.imageInspectorObserver = null;
    }
    if (window.imageDetailsObserver) {
        window.imageDetailsObserver.disconnect();
        window.imageDetailsObserver = null;
    }
    if (window.imageDetailsResizeObserver) {
        window.imageDetailsResizeObserver.disconnect();
        window.imageDetailsResizeObserver = null;
    }
    if (window.imageDetailsResizeHandler) {
        window.removeEventListener('resize', window.imageDetailsResizeHandler);
        window.imageDetailsResizeHandler = null;
    }

    // Remove event listeners and mode markers
    document.querySelectorAll('img').forEach(img => {
        img.style.cursor = '';
        img.classList.remove('image-inspector-hover');
        img.removeEventListener('click', window.imageInspectorClickHandler);
        img.removeEventListener('mouseover', window.imageInspectorHoverHandler);
        img.removeEventListener('mouseout', window.imageInspectorOutHandler);
    });

    if (window.imageInspectorBoundImages instanceof WeakSet) {
        window.imageInspectorBoundImages = new WeakSet();
    }

    // Remove global click handler
    if (window.documentClickHandler) {
        document.removeEventListener('click', window.documentClickHandler);
    }

    // Remove styles
    const styleElement = document.getElementById('image-inspector-styles');
    if (styleElement) styleElement.remove();
}
