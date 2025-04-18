// First, let's remove any existing inspector elements
function cleanup() {
    // Remove any existing overlays
    const overlays = document.querySelectorAll('.image-details-overlay');
    overlays.forEach(overlay => overlay.remove());

    // Remove previous event listeners
    document.querySelectorAll('img').forEach(img => {
        img.style.cursor = '';
        img.classList.remove('image-inspector-hover');
        img.removeEventListener('click', window.imageInspectorClickHandler);
        img.removeEventListener('mouseover', window.imageInspectorHoverHandler);
        img.removeEventListener('mouseout', window.imageInspectorOutHandler);
    });

    // Remove previous global click handler
    if (window.documentClickHandler) {
        document.removeEventListener('click', window.documentClickHandler);
    }

    // Remove previous styles
    const styleElement = document.getElementById('image-inspector-styles');
    if (styleElement) styleElement.remove();
}

// Cleanup first
cleanup();

// Add custom styles for hover effects
const styleElement = document.createElement('style');
styleElement.id = 'image-inspector-styles';
styleElement.textContent = `
    .image-inspector-hover {
      cursor: pointer !important;
      outline: 2px dashed rgba(66, 133, 244, 0.6) !important;
      outline-offset: 2px !important;
    }
  `;
document.head.appendChild(styleElement);

// Common image file extensions to check
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.heif', '.heic', '.gif', '.avif', '.bmp', '.ico'];

// Function to check if URL contains a valid image extension (handles query parameters)
function checkValidImageUrl(url) {
    // Remove query parameters and hash for checking extensions
    const baseUrl = url.split('?')[0].split('#')[0];

    // Check for valid file extensions
    return validExtensions.some(ext => baseUrl.toLowerCase().endsWith(ext));
}

// Function to create and show an overlay for an image
function showImageDetails(img, event) {
    // Stop propagation to prevent document click from immediately removing the overlay
    if (event) {
        event.stopPropagation();
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
        width: `${imgRect.width}px`,
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
        whiteSpace: 'pre-wrap',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: '10000',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        maxWidth: '100%'
    });

    // Reposition the info box based on available space
    if (imgRect.top > 120) {
        // If there's room above the image
        infoBox.style.bottom = '100%';
        infoBox.style.top = 'auto';
        infoBox.style.marginBottom = '5px';
    } else if (document.documentElement.clientHeight - (imgRect.bottom + scrollTop) > 120) {
        // If there's room below the image
        infoBox.style.top = '100%';
        infoBox.style.marginTop = '5px';
    }

    // Add a connector line between border and info box if they're separated
    if (infoBox.style.top === '100%' || infoBox.style.bottom === '100%') {
        const connector = document.createElement('div');
        Object.assign(connector
            .style, {
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
    const intrinsicDecimalRatio = (intrinsicWidth / intrinsicHeight);
    const intrinsicRatioText = formatAspectRatio(intrinsicWidth, intrinsicHeight);

    // Get rendered dimensions (how the image appears on the page)
    const renderedWidth = Math.round(imgRect.width);
    const renderedHeight = Math.round(imgRect.height);

    const renderedDecimalRatio = (renderedWidth / renderedHeight);
    const renderedRatioText = formatAspectRatio(renderedWidth, renderedHeight);

    // Add image file information
    const src = img.getAttribute('src') || '';
    const fileName = src.split('/').pop().split('?')[0];

    // Create the details text
    infoBox.innerHTML = `
      <div style="margin-bottom: 5px"><strong>File:</strong> ${fileName || 'N/A'}</div>
      <div style="margin-bottom: 3px"><strong>Intrinsic:</strong> ${intrinsicWidth}×${intrinsicHeight}</div>
      <div style="margin-bottom: 3px"><strong>Aspect ratio:</strong> ${intrinsicRatioText} (${intrinsicDecimalRatio.toFixed(2)})</div>
      <div style="margin-bottom: 3px"><strong>Rendered:</strong> ${renderedWidth}×${renderedHeight}</div>
      <div><strong>Aspect ratio:</strong> ${renderedRatioText} (${renderedDecimalRatio.toFixed(2)})</div>
    `;

    // Add elements to the container
    overlayContainer.appendChild(highlightBorder);
    overlayContainer.appendChild(infoBox);

    // Add overlay container to the document
    document.body.appendChild(overlayContainer);
}

// Helper function to format aspect ratio as X:Y
function formatAspectRatio(width, height) {
    if (width === 0 || height === 0) return "N/A";

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

// Function to handle clicking on an image
window.imageInspectorClickHandler = function (event) {
    showImageDetails(this, event);
};

// Function to handle hovering over an image
window.imageInspectorHoverHandler = function () {
    this.classList.add('image-inspector-hover');
};

// Function to handle mouse leaving an image
window.imageInspectorOutHandler = function () {
    this.classList.remove('image-inspector-hover');
};

// Attach events to all images on the page
document.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';

    // Check if this is a valid image we want to inspect
    const hasValidExtension = checkValidImageUrl(src) || src.startsWith('data:image/');

    if (hasValidExtension) {
        img.addEventListener('click', window.imageInspectorClickHandler);
        img.addEventListener('mouseover', window.imageInspectorHoverHandler);
        img.addEventListener('mouseout', window.imageInspectorOutHandler);
    }
});

// Add global click handler to remove overlay when clicking elsewhere
window.documentClickHandler = function (event) {
    // Check if the click was on or inside an image
    if (event.target.tagName !== 'IMG') {
        const overlays = document.querySelectorAll('.image-details-overlay');
        overlays.forEach(overlay => {
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        });
    }
};

document.addEventListener('click', window.documentClickHandler);

// Show a notification that inspector mode is active
const notification = document.createElement('div');
notification.textContent = 'Image inspector mode activated';
Object.assign(notification.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '8px 12px',
    backgroundColor: '#34a853',
    color: 'white',
    borderRadius: '4px',
    zIndex: '10000',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    transition: 'opacity 0.5s',
    opacity: '1'
});

document.body.appendChild(notification);

setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 500);
}, 2000);