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
  const OVERLAY_PLACEMENT_THRESHOLD_PX = 150;

  function applyOverlayVerticalPlacement(infoBox, imgRect) {
    if (!infoBox || !imgRect) return;

    infoBox.style.top = '0';
    infoBox.style.bottom = 'auto';
    infoBox.style.marginTop = '0';
    infoBox.style.marginBottom = '0';

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - imgRect.bottom;
    const spaceAbove = imgRect.top;

    if (spaceBelow < OVERLAY_PLACEMENT_THRESHOLD_PX && spaceAbove >= OVERLAY_PLACEMENT_THRESHOLD_PX) {
      infoBox.style.bottom = '100%';
      infoBox.style.top = 'auto';
      infoBox.style.marginBottom = '5px';
      return;
    }

    if (spaceBelow >= OVERLAY_PLACEMENT_THRESHOLD_PX) {
      infoBox.style.top = '100%';
      infoBox.style.marginTop = '5px';
    }
  }

  window.imageDetailsApplyOverlayVerticalPlacement = applyOverlayVerticalPlacement;

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
  let refreshInProgress = false;
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

  function getApproximateDataUrlSize(src) {
    if (!src || !src.toLowerCase().startsWith('data:')) return null;

    const commaIndex = src.indexOf(',');
    if (commaIndex === -1) return null;

    const metadata = src.slice(0, commaIndex);
    const payload = src.slice(commaIndex + 1);

    if (metadata.includes(';base64')) {
      const sanitized = payload.replace(/\s/g, '');
      const paddingLength = (sanitized.match(/=+$/) || [''])[0].length;
      return Math.max(0, Math.floor((sanitized.length * 3) / 4) - paddingLength);
    }

    try {
      return new TextEncoder().encode(decodeURIComponent(payload)).length;
    } catch (error) {
      return new TextEncoder().encode(payload).length;
    }
  }

  function getResourceTimingSize(url) {
    if (!url || typeof performance.getEntriesByName !== 'function') return null;

    const entries = performance.getEntriesByName(url);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (!(entry instanceof PerformanceResourceTiming)) continue;

      const candidates = [entry.decodedBodySize, entry.encodedBodySize, entry.transferSize];
      const size = candidates.find((candidate) => Number.isFinite(candidate) && candidate > 0);
      if (Number.isFinite(size) && size > 0) {
        return size;
      }
    }

    return null;
  }

  function requestBackgroundImageMetadata(url) {
    return new Promise((resolve) => {
      if (!chrome?.runtime?.sendMessage) {
        resolve(null);
        return;
      }

      chrome.runtime.sendMessage({ type: 'fetchImageMetadata', url }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }

        if (!response || response.ok !== true) {
          resolve(null);
          return;
        }

        resolve({
          mimeType: typeof response.mimeType === 'string' ? response.mimeType : null,
          byteLength: Number.isFinite(response.byteLength) && response.byteLength >= 0
            ? response.byteLength
            : null
        });
      });
    });
  }

  async function getImageResponseMetadata(url) {
    const backgroundMetadata = await requestBackgroundImageMetadata(url);
    if (backgroundMetadata) {
      return backgroundMetadata;
    }

    const requestAttempts = [
      { method: 'HEAD', options: {} },
      { method: 'GET', options: { headers: { Range: 'bytes=0-0' } } },
      { method: 'GET', options: {} }
    ];

    for (const attempt of requestAttempts) {
      try {
        const response = await fetch(url, {
          method: attempt.method,
          cache: 'force-cache',
          ...attempt.options
        });

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range') || '';

        let byteLength = Number(contentLength);
        if (!Number.isFinite(byteLength) || byteLength < 0) {
          const totalMatch = contentRange.match(/\/(\d+)$/);
          if (totalMatch) {
            byteLength = Number(totalMatch[1]);
          }
        }

        if ((!Number.isFinite(byteLength) || byteLength < 0) && attempt.method === 'GET') {
          const buffer = await response.clone().arrayBuffer();
          byteLength = buffer.byteLength;
        }

        return {
          mimeType: contentType ? contentType.split(';')[0].trim() : null,
          byteLength: Number.isFinite(byteLength) && byteLength >= 0 ? byteLength : null
        };
      } catch (error) {
        // Ignore request failures and continue with additional fallbacks.
      }
    }

    return { mimeType: null, byteLength: null };
  }

  async function getImageMetrics(url) {
    if (!url) {
      return { fileType: 'N/A', fileSize: 'N/A', mimeType: 'N/A' };
    }

    if (url.toLowerCase().startsWith('data:')) {
      const dataUrlMatch = url.match(/^data:([^;,]+)/i);
      const mimeType = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : 'image/unknown';
      const typeFromMime = mimeType.startsWith('image/') ? mimeType.split('/')[1] : '';
      const normalizedType = normalizeImageType(typeFromMime) || getNormalizedImageType(url);
      const byteLength = getApproximateDataUrlSize(url);

      return {
        fileType: normalizedType ? normalizedType.toUpperCase() : 'N/A',
        fileSize: Number.isFinite(byteLength) ? formatBytes(byteLength) : 'N/A',
        mimeType
      };
    }

    try {
      const responseMetadata = await getImageResponseMetadata(url);
      const mimeType = responseMetadata.mimeType || 'N/A';
      const typeFromMime = responseMetadata.mimeType && responseMetadata.mimeType.toLowerCase().startsWith('image/')
        ? responseMetadata.mimeType.split('/')[1]
        : '';
      const normalizedType = normalizeImageType(typeFromMime) || getNormalizedImageType(url);
      const fileType = normalizedType ? normalizedType.toUpperCase() : 'N/A';
      const resourceTimingSize = getResourceTimingSize(url);
      const resolvedByteLength = responseMetadata.byteLength ?? resourceTimingSize;

      return {
        fileType,
        fileSize: Number.isFinite(resolvedByteLength) && resolvedByteLength >= 0 ? formatBytes(resolvedByteLength) : 'N/A',
        mimeType
      };
    } catch (error) {
      const fallbackType = getNormalizedImageType(url);
      const fallbackSize = getResourceTimingSize(url);

      return {
        fileType: fallbackType ? fallbackType.toUpperCase() : 'N/A',
        fileSize: Number.isFinite(fallbackSize) ? formatBytes(fallbackSize) : 'N/A',
        mimeType: 'N/A'
      };
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

  function getPageRectFromClientRect(rect) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height,
      right: rect.left + scrollLeft + rect.width,
      bottom: rect.top + scrollTop + rect.height
    };
  }

  function rectsIntersect(rectA, rectB) {
    return !(
      rectA.right <= rectB.left
      || rectA.left >= rectB.right
      || rectA.bottom <= rectB.top
      || rectA.top >= rectB.bottom
    );
  }

  function getIntersectionArea(rectA, rectB) {
    const overlapWidth = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
    const overlapHeight = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
    return overlapWidth * overlapHeight;
  }

  function getOccupiedOverlayRects() {
    return Array.from(document.querySelectorAll('.image-details-infobox')).map((box) => {
      const rect = box.getBoundingClientRect();
      return getPageRectFromClientRect(rect);
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function resolveInfoBoxPlacement(imgPageRect, infoWidth, infoHeight, occupiedRects) {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const margin = 8;

    const candidateAnchors = [
      { name: 'right', left: imgPageRect.right + margin, top: imgPageRect.top },
      { name: 'left', left: imgPageRect.left - infoWidth - margin, top: imgPageRect.top },
      { name: 'bottom', left: imgPageRect.left, top: imgPageRect.bottom + margin },
      { name: 'top', left: imgPageRect.left, top: imgPageRect.top - infoHeight - margin }
    ];

    const viewportMinLeft = scrollLeft + margin;
    const viewportMaxLeft = scrollLeft + viewportWidth - infoWidth - margin;
    const viewportMinTop = scrollTop + margin;
    const viewportMaxTop = scrollTop + viewportHeight - infoHeight - margin;

    const scored = candidateAnchors.map((candidate, index) => {
      const left = clamp(candidate.left, viewportMinLeft, Math.max(viewportMinLeft, viewportMaxLeft));
      const top = clamp(candidate.top, viewportMinTop, Math.max(viewportMinTop, viewportMaxTop));
      const rect = {
        left,
        top,
        right: left + infoWidth,
        bottom: top + infoHeight,
        width: infoWidth,
        height: infoHeight
      };

      const imageOverlap = getIntersectionArea(rect, imgPageRect);
      let overlayOverlap = 0;
      for (const occupied of occupiedRects) {
        overlayOverlap += getIntersectionArea(rect, occupied);
      }

      const clampPenalty = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);

      return {
        candidate,
        rect,
        imageOverlap,
        overlayOverlap,
        clampPenalty,
        preferenceOrder: index
      };
    });

    scored.sort((a, b) => {
      if (a.imageOverlap !== b.imageOverlap) return a.imageOverlap - b.imageOverlap;
      if (a.overlayOverlap !== b.overlayOverlap) return a.overlayOverlap - b.overlayOverlap;
      if (a.clampPenalty !== b.clampPenalty) return a.clampPenalty - b.clampPenalty;
      return a.preferenceOrder - b.preferenceOrder;
    });

    return scored[0].rect;
  }

  async function createOverlayForImage(img, options = {}) {
    if (!(img instanceof HTMLImageElement)) return null;

    const {
      clearAllOverlays = false,
      trackOverlay = true,
      includePerformanceSection = true,
      includeSourceMetadata = true,
      allowExternalPlacement = true
    } = options;

    if (clearAllOverlays) {
      const existingOverlays = document.querySelectorAll('.image-details-overlay');
      existingOverlays.forEach((overlay) => overlay.remove());
      imageOverlayMap.delete(img);
      overlaidImages.clear();
    }

    const existingOverlay = imageOverlayMap.get(img);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const src = getImageSource(img);
    const imgRect = img.getBoundingClientRect();
    const imgPageRect = getPageRectFromClientRect(imgRect);
    const renderedWidth = Math.round(imgRect.width);
    const renderedHeight = Math.round(imgRect.height);

    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'image-details-overlay';

    const infoBox = document.createElement('div');
    infoBox.className = 'image-details-infobox';

    const hue = Math.floor(Math.random() * 360);
    const backgroundColor = `hsla(${hue}, 100%, 25%, 0.9)`;

    Object.assign(overlayContainer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      pointerEvents: 'none',
      zIndex: '9999'
    });

    Object.assign(infoBox.style, {
      position: 'absolute',
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
      minWidth: '220px',
      maxWidth: 'min(420px, calc(100vw - 16px))',
      display: 'grid',
      gap: '8px',
      writingMode: 'horizontal-tb',
      textOrientation: 'mixed',
      direction: 'ltr',
      lineHeight: '1.35'
    });

    const intrinsicWidth = img.naturalWidth;
    const intrinsicHeight = img.naturalHeight;

    const intrinsicRatioDetails = formatRatioDetails(intrinsicWidth, intrinsicHeight);
    const renderedRatioDetails = formatRatioDetails(renderedWidth, renderedHeight);

    const fileName = src.split('/').pop().split('?')[0].split('#')[0];
    const imageMetrics = includePerformanceSection ? await getImageMetrics(src) : null;
    const loadingStrategy = img.loading || 'auto';
    const fetchPriority = img.getAttribute('fetchpriority') || 'auto';

    const createRow = (label, value, isPrimary = false) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'grid',
        gridTemplateColumns: isPrimary ? 'max-content minmax(0, 1fr)' : 'max-content minmax(0, 1fr)',
        columnGap: '4px',
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
        gap: '3px'
      });
      return section;
    };

    const fileSection = createSection();
    fileSection.appendChild(createRow('Filename', fileName || 'N/A', true));

    const createPerformanceGrid = (labelA, labelB, valueA, valueB) => {
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: '8px',
        rowGap: '3px'
      });

      const makeCell = (text, isHeader = false) => {
        const cell = document.createElement('div');
        cell.textContent = text;
        if (isHeader) {
          cell.style.fontWeight = '700';
        }
        return cell;
      };

      grid.appendChild(makeCell(labelA, true));
      grid.appendChild(makeCell(labelB, true));
      grid.appendChild(makeCell(valueA));
      grid.appendChild(makeCell(valueB));
      return grid;
    };

    const performanceSection = createSection();
    if (includePerformanceSection && imageMetrics) {
      performanceSection.appendChild(createPerformanceGrid('Type', 'Size', imageMetrics.fileType, imageMetrics.fileSize));
      performanceSection.appendChild(createPerformanceGrid('Loading', 'FetchPriority', loadingStrategy, fetchPriority));
    }

    const geometrySection = document.createElement('div');
    Object.assign(geometrySection.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      columnGap: '8px',
      rowGap: '3px'
    });

    const createGeometryCell = (text, isHeader = false) => {
      const cell = document.createElement('div');
      cell.textContent = text;
      if (isHeader) {
        cell.style.fontWeight = '700';
      }
      return cell;
    };

    geometrySection.appendChild(createGeometryCell('Intrinsic', true));
    geometrySection.appendChild(createGeometryCell('Rendered', true));
    geometrySection.appendChild(createGeometryCell(`${intrinsicWidth}×${intrinsicHeight}`));
    geometrySection.appendChild(createGeometryCell(`${renderedWidth}×${renderedHeight}`));
    geometrySection.appendChild(createGeometryCell(`${intrinsicRatioDetails.ratioText} (${intrinsicRatioDetails.decimalText})`));
    geometrySection.appendChild(createGeometryCell(`${renderedRatioDetails.ratioText} (${renderedRatioDetails.decimalText})`));

    infoBox.appendChild(fileSection);
    if (includePerformanceSection && performanceSection.childNodes.length > 0) {
      infoBox.appendChild(performanceSection);
    }
    infoBox.appendChild(geometrySection);

    const occupiedRects = getOccupiedOverlayRects();

    document.body.appendChild(overlayContainer);
    overlayContainer.appendChild(infoBox);

    const infoRect = infoBox.getBoundingClientRect();
    const targetRect = allowExternalPlacement
      ? resolveInfoBoxPlacement(imgPageRect, infoRect.width, infoRect.height, occupiedRects)
      : {
        left: imgPageRect.left,
        top: imgPageRect.top,
        right: imgPageRect.left + infoRect.width,
        bottom: imgPageRect.top + infoRect.height
      };

    infoBox.style.left = `${targetRect.left}px`;
    infoBox.style.top = `${targetRect.top}px`;

    if (trackOverlay) {
      imageOverlayMap.set(img, overlayContainer);
      overlaidImages.add(img);
    }

    return overlayContainer;
  }

  function clearAllOverlays() {
    document.querySelectorAll('.image-details-overlay').forEach((overlay) => overlay.remove());
    overlaidImages.clear();
  }

  window.imageDetailsAPI = {
    createOverlayForImage,
    clearAllOverlays
  };

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
      for (const img of images) {
        pendingRefreshImages.add(img);
      }
    }

    if (refreshScheduled || refreshInProgress) return;

    refreshScheduled = true;
    window.requestAnimationFrame(() => {
      refreshScheduled = false;
      void flushScheduledRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
    });
  }

  async function flushScheduledRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
    if (refreshInProgress) return;

    refreshInProgress = true;

    try {
      while (refreshAllPending || pendingRefreshImages.size > 0) {
        if (refreshAllPending) {
          await refreshImages(document.querySelectorAll('img'), allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
          refreshAllPending = false;
          pendingRefreshImages.clear();
          continue;
        }

        const imagesToRefresh = Array.from(pendingRefreshImages);
        await refreshImages(imagesToRefresh, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
        for (const img of imagesToRefresh) {
          pendingRefreshImages.delete(img);
        }
      }
    } finally {
      refreshInProgress = false;

      if (refreshAllPending || pendingRefreshImages.size > 0) {
        scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, []);
      }
    }
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

  async function handleMutations(mutations, allowedTypes, minSize, aspectRatioMode, aspectRatioValue) {
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
  }

  const inspectorApiOnlyMode = window.imageDetailsOverlayApiOnly === true;
  window.imageDetailsOverlayApiOnly = false;

  if (inspectorApiOnlyMode) {
    return;
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

    window.imageDetailsObserver = new MutationObserver((mutations) => {
      void handleMutations(mutations, allowedTypes, minSize, aspectRatioMode, aspectRatioValue);
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

    for (const img of document.querySelectorAll('img')) {
      window.imageDetailsResizeObserver.observe(img);
    }

    if (window.imageDetailsResizeHandler) {
      window.removeEventListener('resize', window.imageDetailsResizeHandler);
    }

    window.imageDetailsResizeHandler = () => scheduleRefresh(allowedTypes, minSize, aspectRatioMode, aspectRatioValue, overlaidImages);
    window.addEventListener('resize', window.imageDetailsResizeHandler);
  });
})();
