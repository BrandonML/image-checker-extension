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

    // Add custom styles for hover effects
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

    // Function to check if URL contains a valid image extension (handles query parameters)
    function checkValidImageUrl(url) {
        return Boolean(getNormalizedImageType(url));
    }

    function attachInspectorListeners(img) {
        if (!(img instanceof HTMLImageElement)) return;
        if (imageInspectorBoundImages.has(img)) return;

        const src = img.getAttribute('src') || '';
        const hasValidExtension = checkValidImageUrl(src);
        if (!hasValidExtension) return;

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

    // Current active overlay element
    let currentOverlay = null;

    // Helper function to format aspect ratio as X:Y
    function formatAspectRatio(width, height) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) return 'N/A';

        // Find the greatest common divisor (GCD)
        const gcd = (a, b) => {
            while (b !== 0) {
                const temp = b;
                b = a % b;
                a = temp;
            }
            return a;
        };

        const divisor = gcd(width, height);
        return `${width / divisor}:${height / divisor}`;
    }

    // Helper function to format both ratio styles with safe fallback text
    function formatRatioDetails(width, height) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
            return { ratioText: 'N/A', decimalText: 'N/A' };
        }

        return {
            ratioText: formatAspectRatio(width, height),
            decimalText: (width / height).toFixed(2)
        };
    }

    // Function to create and show an overlay for an image
    function showImageDetails(img, event) {
        // Stop event propagation to ensure it doesn't trigger parent elements
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        // Clear any existing overlays first
        const existingOverlays = document.querySelectorAll('.image-details-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // Create overlay container and elements
        const overlayContainer = document.createElement('div');
        overlayContainer.className = 'image-details-overlay';

        // Overlay will consist of a highlight border and an info box
        const highlightBorder = document.createElement('div');
        const infoBox = document.createElement('div');

        // Position everything relative to the image
        const imgRect = img.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Generate a unique color for this overlay
        const hue = Math.floor(Math.random() * 360);
        const borderColor = `hsla(${hue}, 100%, 50%, 0.8)`;
        const backgroundColor = `hsla(${hue}, 100%, 25%, 0.9)`;

        // Style the container
        Object.assign(overlayContainer.style, {
            position: 'absolute',
            top: `${imgRect.top + scrollTop}px`,
            left: `${imgRect.left + scrollLeft}px`,
            height: `${imgRect.height}px`,
            pointerEvents: 'none',
            zIndex: '9999'
        });

        // Style the highlight border that goes around the image
        Object.assign(highlightBorder.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            border: `3px solid ${borderColor}`,
            pointerEvents: 'none',
            zIndex: '9999'
        });

        // Style the info box that contains the text
        Object.assign(infoBox.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            padding: '8px',
            backgroundColor,
            color: 'white',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'left',
            whiteSpace: 'normal',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: '10000',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            minWidth: '200px'
        });

        // Reposition the info box based on available viewport space
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const spaceBelow = viewportHeight - imgRect.bottom;
        const spaceAbove = imgRect.top;

        if (spaceAbove > 120) {
            // If there's room above the image
            infoBox.style.bottom = '100%';
            infoBox.style.top = 'auto';
            infoBox.style.marginBottom = '5px';
        } else if (spaceBelow > 120) {
            // If there's room below the image
            infoBox.style.top = '100%';
            infoBox.style.marginTop = '5px';
        }

        // Add a connector line between border and info box if they're separated
        if (infoBox.style.top === '100%' || infoBox.style.bottom === '100%') {
            const connector = document.createElement('div');
            Object.assign(connector.style, {
                position: 'absolute',
                backgroundColor: borderColor,
                width: '2px',
                height: '5px',
                left: '10px',
                zIndex: '9999'
            });

            if (infoBox.style.top === '100%') {
                connector.style.top = '100%';
            } else {
                connector.style.bottom = '100%';
            }

            overlayContainer.appendChild(connector);
        }

        // Get intrinsic dimensions (natural dimensions of the image)
        const intrinsicWidth = img.naturalWidth;
        const intrinsicHeight = img.naturalHeight;

        // Calculate both decimal and ratio format for aspect ratios
        const intrinsicRatioDetails = formatRatioDetails(intrinsicWidth, intrinsicHeight);

        // Get rendered dimensions (how the image appears on the page)
        const renderedWidth = Math.round(imgRect.width);
        const renderedHeight = Math.round(imgRect.height);

        const renderedRatioDetails = formatRatioDetails(renderedWidth, renderedHeight);

        // Add image file information
        const src = img.getAttribute('src') || '';
        const fileName = src.split('/').pop().split('?')[0];

        const appendDetailsRow = (label, value, withMargin = true) => {
            const row = document.createElement('div');
            if (withMargin) {
                row.style.marginBottom = '5px';
            }

            const labelElement = document.createElement('strong');
            labelElement.textContent = `${label}:`;

            const valueElement = document.createElement('span');
            valueElement.textContent = ` ${value}`;

            row.appendChild(labelElement);
            row.appendChild(valueElement);
            infoBox.appendChild(row);
        };

        const appendSpacer = () => {
            const spacer = document.createElement('div');
            spacer.style.marginBottom = '5px';
            infoBox.appendChild(spacer);
        };

        appendDetailsRow('File', fileName || 'N/A');
        appendSpacer();
        appendDetailsRow('Intrinsic', `${intrinsicWidth}×${intrinsicHeight}`);
        appendDetailsRow('Aspect ratio', `${intrinsicRatioDetails.ratioText} (${intrinsicRatioDetails.decimalText})`);
        appendSpacer();
        appendDetailsRow('Rendered', `${renderedWidth}×${renderedHeight}`);
        appendDetailsRow('Aspect ratio', `${renderedRatioDetails.ratioText} (${renderedRatioDetails.decimalText})`, false);

        // Add elements to the container
        overlayContainer.appendChild(highlightBorder);
        overlayContainer.appendChild(infoBox);

        // Add overlay container to the document
        document.body.appendChild(overlayContainer);

        // Store current overlay reference
        currentOverlay = overlayContainer;
    }

    // Function to handle mouse hovering over an image - now shows details
    window.imageInspectorHoverHandler = function (event) {
        // Add highlight class for visual feedback
        this.classList.add('image-inspector-hover');

        // Show image details on hover instead of click
        showImageDetails(this, event);
    };

    // Function to handle mouse leaving an image
    window.imageInspectorOutHandler = function () {
        this.classList.remove('image-inspector-hover');

        // Remove overlay when mouse leaves the image
        if (currentOverlay) {
            currentOverlay.remove();
            currentOverlay = null;
        }
    };

    // Capture click events on the entire document
    window.imageInspectorClickHandler = function (event) {
        // For linked images, we'll want to intercept clicks in some cases
        const img = this;
        const parentAnchor = img.closest('a');

        if (parentAnchor) {
            // If the image is in a link, show details on click and prevent navigation
            event.preventDefault();
            event.stopPropagation();
            showImageDetails(img, event);

            return false;
        }

        // For non-linked images, just show details
        showImageDetails(img, event);
    };

    // Attach events to existing images on first run.
    document.querySelectorAll('img').forEach(attachInspectorListeners);

    // Observe DOM mutations to attach listeners only for newly added images.
    if (window.imageInspectorObserver) {
        window.imageInspectorObserver.disconnect();
    }

    window.imageInspectorObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(processAddedNode);
        });
    });

    if (document.body) {
        window.imageInspectorObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
