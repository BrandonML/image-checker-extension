// Function to prevent duplicate execution
(function () {
  // Select all images on the page
  const images = document.querySelectorAll('img');

  // Common image file extensions to check
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.heif', '.heic', '.gif', '.avif', '.bmp', '.ico'];

  // Process each image
  images.forEach(img => {
    // Check if the image has a valid file extension (if src is available)
    const src = img.getAttribute('src') || '';

    // Function to check if URL contains a valid image extension (handles query parameters)
    const checkValidImageUrl = (url) => {
      // Remove query parameters and hash for checking extensions
      const baseUrl = url.split('?')[0].split('#')[0];

      // Check for valid file extensions
      return validExtensions.some(ext => baseUrl.toLowerCase().endsWith(ext));
    };

    // Check various conditions for valid images
    const hasValidExtension = checkValidImageUrl(src) ||
      // Check for data URLs with image MIME types
      (src.startsWith('data:image/') &&
        validExtensions.some(ext => src.includes(`image/${ext.substring(1)}`)));

    // Skip images that don't match our criteria
    if (!hasValidExtension && src.indexOf('data:image/') !== 0) {
      return;
    }

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

    // Reposition the info box based on available space
    // Try to position it where it won't overlap other elements as much
    if (imgRect.top > 100) {
      // If there's room above the image
      infoBox.style.bottom = '100%';
      infoBox.style.top = 'auto';
      infoBox.style.marginBottom = '5px';
    } else if (document.documentElement.clientHeight - (imgRect.bottom + scrollTop) > 100) {
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
    const intrinsicDecimalRatio = (intrinsicWidth / intrinsicHeight);
    const intrinsicRatioText = formatAspectRatio(intrinsicWidth, intrinsicHeight);

    // Get rendered dimensions (how the image appears on the page)
    const renderedWidth = Math.round(imgRect.width);
    const renderedHeight = Math.round(imgRect.height);

    const renderedDecimalRatio = (renderedWidth / renderedHeight);
    const renderedRatioText = formatAspectRatio(renderedWidth, renderedHeight);

    const fileName = src.split('/').pop().split('?')[0];

    // Create the details text
    infoBox.innerHTML = `
      <div style="margin-bottom: 5px"><strong>File:</strong> ${fileName || 'N/A'}</div>
      <br/>
      <div style="margin-bottom: 5px"><strong>Intrinsic:</strong> ${intrinsicWidth}×${intrinsicHeight}</div>
      <div style="margin-bottom: 5px"><strong>Aspect ratio:</strong> ${intrinsicRatioText} (${intrinsicDecimalRatio.toFixed(2)})</div>
      <br/>
      <div style="margin-bottom: 5px"><strong>Rendered:</strong> ${renderedWidth}×${renderedHeight}</div>
      <div><strong>Aspect ratio:</strong> ${renderedRatioText} (${renderedDecimalRatio.toFixed(2)})</div>
    `;

    // Add elements to the container
    overlayContainer.appendChild(highlightBorder);
    overlayContainer.appendChild(infoBox);

    // Add overlay container to the document
    document.body.appendChild(overlayContainer);

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
  });

})(); // End of self-executing function to prevent duplicate variable declarations