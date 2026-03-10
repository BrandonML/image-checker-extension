// Function to prevent duplicate execution
(function () {
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
    const extensionMatch = baseUrl.match(/\.([a-zA-Z0-9+-]+)$/);

    if (extensionMatch) {
      return normalizeImageType(extensionMatch[1]);
    }

    const dataUrlMatch = src.match(/^data:image\/([^;,]+)/i);
    if (dataUrlMatch) {
      return normalizeImageType(dataUrlMatch[1]);
    }

    return null;
  }

  // Get filter settings from storage, with defaults
  chrome.storage.local.get('filterSettings', function (result) {
    const settings = result.filterSettings || {};
    const allowedTypes = Array.isArray(settings.allowedTypes)
      ? settings.allowedTypes.map(normalizeImageType).filter(Boolean)
      : null; // Null means all types are allowed initially
    const minSize = settings.minSize || 0;

    // Select all images on the page
    const images = document.querySelectorAll('img');

    // Helper function to format aspect ratio as X:Y
    function formatAspectRatio(width, height) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
        return 'N/A';
      }

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

    // Process each image
    images.forEach(img => {
      const src = img.getAttribute('src') || '';
      const imgRect = img.getBoundingClientRect();
      const renderedWidth = Math.round(imgRect.width);
      const renderedHeight = Math.round(imgRect.height);

      // 1. Check for minimum size
      if (renderedWidth < minSize) {
        return; // Skip if smaller than min size
      }

      // 2. Check for file type
      const fileType = getNormalizedImageType(src);
      if (allowedTypes && !allowedTypes.includes(fileType)) {
        return; // Skip if not in the allowed types list
      }

      // Create overlay container and elements
      const overlayContainer = document.createElement('div');
      overlayContainer.className = 'image-details-overlay';

    // Overlay will consist of a highlight border and an info box
    const highlightBorder = document.createElement('div');
    const infoBox = document.createElement('div');

    // Position everything relative to the image
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Generate a unique color for this overlay (to visually connect border and info box)
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
      padding: '5px',
      backgroundColor,
      color: 'white',
      fontSize: '12px',
      fontFamily: 'monospace',
      textAlign: 'left',
      whiteSpace: 'normal',
      borderRadius: '3px',
      pointerEvents: 'none',
      zIndex: '10000',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      minWidth: '200px'
    });

    // Reposition the info box based on available viewport space
    // Try to position it where it won't overlap other elements as much
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - imgRect.bottom;
    const spaceAbove = imgRect.top;

    if (spaceAbove > 100) {
      // If there's room above the image
      infoBox.style.bottom = '100%';
      infoBox.style.top = 'auto';
      infoBox.style.marginBottom = '5px';
    } else if (spaceBelow > 100) {
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
    const renderedRatioDetails = formatRatioDetails(renderedWidth, renderedHeight);

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
    });
  });
})();
