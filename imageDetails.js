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

  const processedImageState = new WeakMap();
  const imageOverlayMap = new WeakMap();
  let refreshScheduled = false;

  function formatAspectRatio(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
      return 'N/A';
    }

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

  function formatRatioDetails(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
      return { ratioText: 'N/A', decimalText: 'N/A' };
    }

    return {
      ratioText: formatAspectRatio(width, height),
      decimalText: (width / height).toFixed(2)
    };
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

  function shouldRenderOverlay(img, allowedTypes, minSize) {
    const src = getImageSource(img);
    const imgRect = img.getBoundingClientRect();
    const renderedWidth = Math.round(imgRect.width);

    if (renderedWidth < minSize) {
      return false;
    }

    const fileType = getNormalizedImageType(src);
    if (allowedTypes && !allowedTypes.includes(fileType)) {
      return false;
    }

    return true;
  }

  function createOverlayForImage(img) {
    const src = getImageSource(img);
    const imgRect = img.getBoundingClientRect();
    const renderedWidth = Math.round(imgRect.width);
    const renderedHeight = Math.round(imgRect.height);

    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'image-details-overlay';

    const highlightBorder = document.createElement('div');
    const infoBox = document.createElement('div');

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const hue = Math.floor(Math.random() * 360);
    const borderColor = `hsla(${hue}, 100%, 50%, 0.8)`;
    const backgroundColor = `hsla(${hue}, 100%, 25%, 0.9)`;

    Object.assign(overlayContainer.style, {
      position: 'absolute',
      top: `${imgRect.top + scrollTop}px`,
      left: `${imgRect.left + scrollLeft}px`,
      height: `${imgRect.height}px`,
      pointerEvents: 'none',
      zIndex: '9999'
    });

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

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - imgRect.bottom;
    const spaceAbove = imgRect.top;

    if (spaceAbove > 100) {
      infoBox.style.bottom = '100%';
      infoBox.style.top = 'auto';
      infoBox.style.marginBottom = '5px';
    } else if (spaceBelow > 100) {
      infoBox.style.top = '100%';
      infoBox.style.marginTop = '5px';
    }

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

    const intrinsicWidth = img.naturalWidth;
    const intrinsicHeight = img.naturalHeight;

    const intrinsicRatioDetails = formatRatioDetails(intrinsicWidth, intrinsicHeight);
    const renderedRatioDetails = formatRatioDetails(renderedWidth, renderedHeight);

    const fileName = src.split('/').pop().split('?')[0].split('#')[0];

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

    overlayContainer.appendChild(highlightBorder);
    overlayContainer.appendChild(infoBox);

    const existingOverlay = imageOverlayMap.get(img);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    document.body.appendChild(overlayContainer);
    imageOverlayMap.set(img, overlayContainer);
  }

  function processImage(img, allowedTypes, minSize) {
    if (!(img instanceof HTMLImageElement)) return;

    const rect = img.getBoundingClientRect();
    const currentSignature = [
      getImageSource(img),
      img.naturalWidth || 0,
      img.naturalHeight || 0,
      Math.round(rect.width),
      Math.round(rect.height),
      Math.round(rect.top + (window.pageYOffset || document.documentElement.scrollTop)),
      Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft))
    ].join('|');

    if (processedImageState.get(img) === currentSignature) {
      return;
    }

    if (!shouldRenderOverlay(img, allowedTypes, minSize)) {
      const existingOverlay = imageOverlayMap.get(img);
      if (existingOverlay) {
        existingOverlay.remove();
        imageOverlayMap.delete(img);
      }
      processedImageState.set(img, currentSignature);
      return;
    }

    createOverlayForImage(img);
    processedImageState.set(img, currentSignature);
  }

  function refreshAllImages(allowedTypes, minSize) {
    document.querySelectorAll('img').forEach((img) => processImage(img, allowedTypes, minSize));
  }

  function scheduleRefresh(allowedTypes, minSize) {
    if (refreshScheduled) return;

    refreshScheduled = true;
    window.requestAnimationFrame(() => {
      refreshScheduled = false;
      refreshAllImages(allowedTypes, minSize);
    });
  }

  function processAddedNode(node, allowedTypes, minSize) {
    if (!(node instanceof Element)) return;

    if (node instanceof HTMLImageElement) {
      processImage(node, allowedTypes, minSize);
      if (window.imageDetailsResizeObserver) {
        window.imageDetailsResizeObserver.observe(node);
      }
    }

    node.querySelectorAll('img').forEach((img) => {
      processImage(img, allowedTypes, minSize);
      if (window.imageDetailsResizeObserver) {
        window.imageDetailsResizeObserver.observe(img);
      }
    });
  }

  function cleanupRemovedImage(img) {
    const existingOverlay = imageOverlayMap.get(img);
    if (existingOverlay) {
      existingOverlay.remove();
      imageOverlayMap.delete(img);
    }

    processedImageState.delete(img);

    if (window.imageDetailsResizeObserver) {
      window.imageDetailsResizeObserver.unobserve(img);
    }
  }

  function cleanupRemovedNode(node) {
    if (!(node instanceof Element)) return;

    if (node instanceof HTMLImageElement) {
      cleanupRemovedImage(node);
    }

    node.querySelectorAll('img').forEach((img) => cleanupRemovedImage(img));
  }

  chrome.storage.local.get('filterSettings', function (result) {
    const settings = result.filterSettings || {};
    const allowedTypes = Array.isArray(settings.allowedTypes)
      ? settings.allowedTypes.map(normalizeImageType).filter(Boolean)
      : null;
    const minSize = settings.minSize || 0;

    refreshAllImages(allowedTypes, minSize);

    if (window.imageDetailsObserver) {
      window.imageDetailsObserver.disconnect();
    }

    window.imageDetailsObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => processAddedNode(node, allowedTypes, minSize));
        mutation.removedNodes.forEach((node) => cleanupRemovedNode(node));

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
          processImage(mutation.target, allowedTypes, minSize);
        }
      });
    });

    if (document.body) {
      window.imageDetailsObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset']
      });
    }

    if (window.imageDetailsResizeObserver) {
      window.imageDetailsResizeObserver.disconnect();
    }

    window.imageDetailsResizeObserver = new ResizeObserver(() => {
      scheduleRefresh(allowedTypes, minSize);
    });

    document.querySelectorAll('img').forEach((img) => window.imageDetailsResizeObserver.observe(img));

    if (window.imageDetailsResizeHandler) {
      window.removeEventListener('resize', window.imageDetailsResizeHandler);
    }

    window.imageDetailsResizeHandler = () => scheduleRefresh(allowedTypes, minSize);
    window.addEventListener('resize', window.imageDetailsResizeHandler);
  });
})();
