// Function to prevent duplicate execution
(function () {
  const SUPPORTED_IMAGE_TYPES = new Set(['jpeg', 'png', 'webp', 'svg', 'heif', 'heic', 'gif', 'avif', 'bmp', 'ico']);
  const FILTERABLE_IMAGE_TYPES = new Set(['jpeg', 'png', 'gif', 'svg', 'webp']);
  const IMAGE_TYPE_ALIASES = {
    jpg: 'jpeg',
    'svg+xml': 'svg',
    'x-icon': 'ico',
    'vnd.microsoft.icon': 'ico'
  };
  const ASPECT_RATIO_FILTER_MODES = new Set(['any', 'match', 'exclude']);
  const ASPECT_RATIO_OPTIONS = new Set(['1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16', '21:9', '16:10', '5:4', '32:9']);
  const ASPECT_RATIO_TOLERANCE = 0.015;

  function normalizeImageType(type) {
    if (!type) return null;

    const normalized = type.toLowerCase();
    const mappedType = IMAGE_TYPE_ALIASES[normalized] || normalized;

    return SUPPORTED_IMAGE_TYPES.has(mappedType) ? mappedType : null;
  }

  function getTypeFromDataUrl(src) {
    if (!src) return null;

    const dataUrlMatch = src.match(/^data:image\/([^;,]+)/i);
    if (!dataUrlMatch) return null;

    return normalizeImageType(dataUrlMatch[1]);
  }

  function getTypeFromUrlExtension(src) {
    if (!src) return null;

    const baseUrl = src.split('?')[0].split('#')[0];
    const extensionMatch = baseUrl.match(/\.([a-zA-Z0-9+.-]+)$/);

    if (!extensionMatch) return null;

    return normalizeImageType(extensionMatch[1]);
  }

  function getTypeFromQueryParams(src) {
    if (!src) return null;

    try {
      const parsedUrl = new URL(src, window.location.href);
      const typeHints = ['format', 'fm', 'type', 'ext'];

      for (const key of typeHints) {
        const hintedValue = parsedUrl.searchParams.get(key);
        const normalizedType = normalizeImageType(hintedValue);
        if (normalizedType) {
          return normalizedType;
        }
      }
    } catch (error) {
      // Ignore invalid URLs and continue with other heuristics.
    }

    return null;
  }

  function getTypeFromPictureSource(img, src) {
    if (!(img instanceof HTMLImageElement)) return null;

    const picture = img.closest('picture');
    if (!picture) return null;

    const normalizedSrc = src || getImageSource(img);

    const matchingSource = Array.from(picture.querySelectorAll('source')).find((source) => {
      const sourceSrcset = source.getAttribute('srcset') || '';
      if (!sourceSrcset || !normalizedSrc) return false;

      return sourceSrcset
        .split(',')
        .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
        .some((candidateUrl) => {
          if (!candidateUrl) return false;

          try {
            const resolvedCandidate = new URL(candidateUrl, document.baseURI).href;
            const resolvedCurrent = new URL(normalizedSrc, document.baseURI).href;
            return resolvedCandidate === resolvedCurrent;
          } catch (error) {
            return candidateUrl === normalizedSrc;
          }
        });
    });

    const sourceWithType = matchingSource || picture.querySelector('source[type]');
    if (!sourceWithType) return null;

    const sourceType = sourceWithType.getAttribute('type') || '';
    if (!sourceType.toLowerCase().startsWith('image/')) return null;

    const mimeSubtype = sourceType.split('/')[1] || sourceType;
    return normalizeImageType(mimeSubtype);
  }

  function getNormalizedImageType(src, img = null) {
    if (!src) return null;

    return (
      getTypeFromDataUrl(src)
      || getTypeFromUrlExtension(src)
      || getTypeFromQueryParams(src)
      || getTypeFromPictureSource(img, src)
    );
  }

  const processedImageState = new WeakMap();
  const imageOverlayMap = new WeakMap();
  const overlaidImages = new Set();
  let refreshScheduled = false;
  let refreshAllPending = false;
  const pendingRefreshImages = new Set();

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


  function parseAspectRatioValue(value) {
    if (!ASPECT_RATIO_OPTIONS.has(value)) return null;

    const [widthPart, heightPart] = value.split(':');
    const width = Number(widthPart);
    const height = Number(heightPart);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return width / height;
  }

  function imageMatchesAspectRatioFilter(img, aspectRatioMode, aspectRatioValue) {
    if (aspectRatioMode === 'any') return true;

    const targetRatio = parseAspectRatioValue(aspectRatioValue);
    if (!Number.isFinite(targetRatio)) return true;

    const intrinsicWidth = img.naturalWidth;
    const intrinsicHeight = img.naturalHeight;

    if (!Number.isFinite(intrinsicWidth) || !Number.isFinite(intrinsicHeight) || intrinsicWidth <= 0 || intrinsicHeight <= 0) {
      return aspectRatioMode === 'exclude';
    }

    const imageRatio = intrinsicWidth / intrinsicHeight;
    const ratioDiff = Math.abs(imageRatio - targetRatio);
    const isMatch = ratioDiff <= ASPECT_RATIO_TOLERANCE;

    if (aspectRatioMode === 'match') return isMatch;
    if (aspectRatioMode === 'exclude') return !isMatch;

    return true;
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

  function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return 'N/A';

    if (value < 1024) return `${value} B`;

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = -1;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
  }

  async function getImageMetrics(url) {
    if (!url) {
      return { fileType: 'N/A', fileSize: 'N/A', mimeType: 'N/A' };
    }

    if (url.toLowerCase().startsWith('data:')) {
      return { fileType: 'BASE64', fileSize: 'N/A', mimeType: 'BASE64' };
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });

      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      const mimeType = contentType ? contentType.split(';')[0].trim() : 'N/A';
      const typeFromMime = mimeType.toLowerCase().startsWith('image/')
        ? mimeType.split('/')[1]
        : '';
      const normalizedType = normalizeImageType(typeFromMime) || getNormalizedImageType(url);
      const fileType = normalizedType ? normalizedType.toUpperCase() : 'N/A';
      const parsedLength = Number(contentLength);

      return {
        fileType,
        fileSize: Number.isFinite(parsedLength) && parsedLength >= 0 ? formatBytes(parsedLength) : 'N/A',
        mimeType: mimeType || 'N/A'
      };
    } catch (error) {
      return { fileType: 'N/A', fileSize: 'N/A', mimeType: 'N/A' };
    }
  }

  function shouldRenderOverlay(img, allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
    const src = getImageSource(img);
    const imgRect = img.getBoundingClientRect();
    const renderedWidth = Math.round(imgRect.width);

    if (renderedWidth < minSize) {
      return false;
    }

    const fileType = getNormalizedImageType(src, img);
    const hasTypeFilter = Array.isArray(allowedTypes) && allowedTypes.length > 0;

    if (hasTypeFilter) {
      const fullTypeSelection =
        allowedTypes.length === FILTERABLE_IMAGE_TYPES.size
        && Array.from(FILTERABLE_IMAGE_TYPES).every((type) => allowedTypes.includes(type));

      if (!fullTypeSelection && !allowedTypes.includes(fileType)) {
        return false;
      }
    }

    if (!imageMatchesAspectRatioFilter(img, aspectRatioMode, aspectRatioValue)) {
      return false;
    }

    return true;
  }

  async function createOverlayForImage(img) {
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
      padding: '8px',
      backgroundColor,
      color: 'white',
      fontSize: '12px',
      fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      textAlign: 'left',
      whiteSpace: 'normal',
      borderRadius: '3px',
      pointerEvents: 'none',
      zIndex: '10000',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      minWidth: '260px',
      display: 'grid',
      gap: '8px'
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
    const imageMetrics = await getImageMetrics(src);
    const ramEstimateBytes = intrinsicWidth * intrinsicHeight * 4;
    const ramEstimateDisplay = formatBytes(ramEstimateBytes);
    const loadingStrategy = img.loading || 'auto';
    const fetchPriority = img.getAttribute('fetchpriority') || 'auto';

    const createRow = (label, value, isPrimary = false) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'grid',
        gridTemplateColumns: isPrimary ? 'auto 1fr' : '110px 1fr',
        columnGap: '6px',
        alignItems: 'baseline'
      });

      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      labelElement.style.fontWeight = '700';

      const valueElement = document.createElement('span');
      valueElement.textContent = value;
      valueElement.style.wordBreak = 'break-word';

      row.appendChild(labelElement);
      row.appendChild(valueElement);
      return row;
    };

    const createSection = () => {
      const section = document.createElement('div');
      Object.assign(section.style, {
        display: 'grid',
        gap: '4px'
      });
      return section;
    };

    const fileSection = createSection();
    fileSection.appendChild(createRow('Filename', fileName || 'N/A', true));

    const performanceSection = createSection();
    performanceSection.appendChild(
      createRow(
        'Performance',
        `type=${imageMetrics.fileType} • size=${imageMetrics.fileSize} • ram=${ramEstimateDisplay} • loading=${loadingStrategy} • fetchpriority=${fetchPriority}`
      )
    );

    const geometrySection = document.createElement('div');
    Object.assign(geometrySection.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px'
    });

    const intrinsicColumn = createSection();
    intrinsicColumn.appendChild(createRow('Intrinsic', `${intrinsicWidth}×${intrinsicHeight}`));
    intrinsicColumn.appendChild(createRow('Ratio', `${intrinsicRatioDetails.ratioText} (${intrinsicRatioDetails.decimalText})`));

    const renderedColumn = createSection();
    renderedColumn.appendChild(createRow('Rendered', `${renderedWidth}×${renderedHeight}`));
    renderedColumn.appendChild(createRow('Ratio', `${renderedRatioDetails.ratioText} (${renderedRatioDetails.decimalText})`));

    geometrySection.appendChild(intrinsicColumn);
    geometrySection.appendChild(renderedColumn);

    infoBox.appendChild(fileSection);
    infoBox.appendChild(performanceSection);
    infoBox.appendChild(geometrySection);

    overlayContainer.appendChild(highlightBorder);
    overlayContainer.appendChild(infoBox);

    const existingOverlay = imageOverlayMap.get(img);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    document.body.appendChild(overlayContainer);
    imageOverlayMap.set(img, overlayContainer);
    overlaidImages.add(img);
  }

  async function processImage(img, allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
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

    if (!shouldRenderOverlay(img, allowedTypes, minSize, aspectRatioMode, aspectRatioValue)) {
      const existingOverlay = imageOverlayMap.get(img);
      if (existingOverlay) {
        existingOverlay.remove();
        imageOverlayMap.delete(img);
        overlaidImages.delete(img);
      }
      processedImageState.set(img, currentSignature);
      return;
    }

    await createOverlayForImage(img);
    processedImageState.set(img, currentSignature);
  }

  async function refreshImages(images, allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
    for (const img of images) {
      await processImage(img, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
    }
  }

  function scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, images = null) {
    if (images === null) {
      refreshAllPending = true;
    } else {
      images.forEach((img) => pendingRefreshImages.add(img));
    }

    if (refreshScheduled) return;

    refreshScheduled = true;
    window.requestAnimationFrame(async () => {
      refreshScheduled = false;

      if (refreshAllPending) {
        refreshAllPending = false;
        pendingRefreshImages.clear();
        await refreshImages(document.querySelectorAll('img'), allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
        return;
      }

      if (pendingRefreshImages.size > 0) {
        const imagesToRefresh = Array.from(pendingRefreshImages);
        pendingRefreshImages.clear();
        await refreshImages(imagesToRefresh, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
      }
    });
  }

  async function processAddedNode(node, allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
    if (!(node instanceof Element)) return;

    if (node instanceof HTMLImageElement) {
      await processImage(node, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
      if (window.imageDetailsResizeObserver) {
        window.imageDetailsResizeObserver.observe(node);
      }
    }

    for (const img of node.querySelectorAll('img')) {
      await processImage(img, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
      if (window.imageDetailsResizeObserver) {
        window.imageDetailsResizeObserver.observe(img);
      }
    }
  }

  function cleanupRemovedImage(img) {
    const existingOverlay = imageOverlayMap.get(img);
    if (existingOverlay) {
      existingOverlay.remove();
      imageOverlayMap.delete(img);
    }
    overlaidImages.delete(img);

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
      ? settings.allowedTypes
        .map(normalizeImageType)
        .filter((type) => FILTERABLE_IMAGE_TYPES.has(type))
      : null;
    const minSize = settings.minSize || 0;
    const aspectRatioMode = ASPECT_RATIO_FILTER_MODES.has(settings.aspectRatioMode)
      ? settings.aspectRatioMode
      : 'any';
    const aspectRatioValue = ASPECT_RATIO_OPTIONS.has(settings.aspectRatioValue)
      ? settings.aspectRatioValue
      : '1:1';

    scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, null);

    if (window.imageDetailsObserver) {
      window.imageDetailsObserver.disconnect();
    }

    window.imageDetailsObserver = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          await processAddedNode(node, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
        }

        for (const node of mutation.removedNodes) {
          cleanupRemovedNode(node);
        }

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
          await processImage(mutation.target, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
        }
      }
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
      scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, overlaidImages);
    });

    document.querySelectorAll('img').forEach((img) => window.imageDetailsResizeObserver.observe(img));

    if (window.imageDetailsResizeHandler) {
      window.removeEventListener('resize', window.imageDetailsResizeHandler);
    }

    window.imageDetailsResizeHandler = () => scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, overlaidImages);
    window.addEventListener('resize', window.imageDetailsResizeHandler);
  });
})();
