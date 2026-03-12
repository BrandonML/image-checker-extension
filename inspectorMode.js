(function () {
    if (!(window.imageInspectorBoundImages instanceof WeakSet)) {
        window.imageInspectorBoundImages = new WeakSet();
    }

    const imageInspectorBoundImages = window.imageInspectorBoundImages;

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

    if (!document.getElementById('image-inspector-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'image-inspector-styles';
        styleElement.textContent = `
            .image-inspector-hover {
              outline: 2px dashed rgba(66, 133, 244, 0.6) !important;
              outline-offset: 2px !important;
            }
          `;
        document.head.appendChild(styleElement);
    }

    function checkValidImageUrl(url) {
        return Boolean(getNormalizedImageType(url));
    }

    function hasValidImageInSrcset(srcset) {
        if (!srcset) return false;

        return srcset
            .split(',')
            .map(candidate => candidate.trim())
            .some(candidate => {
                if (!candidate) return false;

                const [candidateUrl] = candidate.split(/\s+/, 1);
                return checkValidImageUrl(candidateUrl);
            });
    }

    function isInspectableImage(img) {
        const src = img.getAttribute('src') || '';
        if (checkValidImageUrl(src)) return true;

        const srcset = img.getAttribute('srcset') || '';
        if (hasValidImageInSrcset(srcset)) return true;

        return checkValidImageUrl(img.currentSrc || '');
    }

    async function renderOverlayForInspector(img, event) {
        if (!(img instanceof HTMLImageElement)) return;

        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const imageDetailsAPI = window.imageDetailsAPI;
        if (!imageDetailsAPI || typeof imageDetailsAPI.createOverlayForImage !== 'function') {
            return;
        }

        await imageDetailsAPI.createOverlayForImage(img, {
            clearAllOverlays: true,
            trackOverlay: false,
            includePerformanceSection: false,
            includeSourceMetadata: false
        });
    }

    function attachInspectorListeners(img) {
        if (!(img instanceof HTMLImageElement)) return;
        if (imageInspectorBoundImages.has(img)) return;

        if (!isInspectableImage(img)) return;

        img.addEventListener('mouseover', window.imageInspectorHoverHandler);
        img.addEventListener('mouseout', window.imageInspectorOutHandler);
        img.addEventListener('click', window.imageInspectorClickHandler);
        imageInspectorBoundImages.add(img);
    }

    function processAddedNode(node) {
        if (!(node instanceof Element)) return;

        if (node instanceof HTMLImageElement) {
            attachInspectorListeners(node);
        }

        node.querySelectorAll('img').forEach(attachInspectorListeners);
    }

    window.imageInspectorHoverHandler = function (event) {
        this.classList.add('image-inspector-hover');
        renderOverlayForInspector(this, event);
    };

    window.imageInspectorOutHandler = function () {
        this.classList.remove('image-inspector-hover');

        if (window.imageDetailsAPI && typeof window.imageDetailsAPI.clearAllOverlays === 'function') {
            window.imageDetailsAPI.clearAllOverlays();
        }
    };

    window.imageInspectorClickHandler = function (event) {
        const img = this;
        const parentAnchor = img.closest('a');

        if (parentAnchor) {
            event.preventDefault();
            event.stopPropagation();
            renderOverlayForInspector(img, event);
            return false;
        }

        renderOverlayForInspector(img, event);
    };

    document.querySelectorAll('img').forEach(attachInspectorListeners);

    if (window.imageInspectorObserver) {
        window.imageInspectorObserver.disconnect();
    }

    window.imageInspectorObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(processAddedNode);

            if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
                attachInspectorListeners(mutation.target);
            }
        });
    });

    if (document.body) {
        window.imageInspectorObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset']
        });
    }
})();
