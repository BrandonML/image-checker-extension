(function () {
  if (window.imageDetailsUtils) return;

  const SUPPORTED_IMAGE_TYPES = new Set(['jpeg', 'png', 'webp', 'svg', 'heif', 'heic', 'gif', 'avif', 'bmp', 'ico']);

  const IMAGE_TYPE_ALIASES = {
    jpg: 'jpeg',
    'svg+xml': 'svg',
    'x-icon': 'ico',
    'vnd.microsoft.icon': 'ico'
  };

  const ASPECT_RATIO_FILTER_MODES = new Set(['any', 'match', 'exclude']);

  const ASPECT_RATIO_OPTIONS_ARRAY = [
    '1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16', '21:9', '16:10', '5:4', '32:9'
  ];

  const ASPECT_RATIO_OPTIONS_SET = new Set(ASPECT_RATIO_OPTIONS_ARRAY);

  const FILTER_IMAGE_TYPES = [
    { value: 'jpeg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'svg', label: 'SVG' },
    { value: 'webp', label: 'WEBP' }
  ];

  const FILTER_IMAGE_TYPE_VALUES = new Set(FILTER_IMAGE_TYPES.map((type) => type.value));

  const FILTERABLE_IMAGE_TYPES = FILTER_IMAGE_TYPE_VALUES;

  function normalizeImageType(type) {
    if (!type) return null;

    const normalized = type.toLowerCase();
    const mappedType = IMAGE_TYPE_ALIASES[normalized] || normalized;

    return SUPPORTED_IMAGE_TYPES.has(mappedType) ? mappedType : null;
  }

  window.imageDetailsUtils = {
    SUPPORTED_IMAGE_TYPES,
    IMAGE_TYPE_ALIASES,
    ASPECT_RATIO_FILTER_MODES,
    ASPECT_RATIO_OPTIONS_ARRAY,
    ASPECT_RATIO_OPTIONS_SET,
    FILTER_IMAGE_TYPES,
    FILTER_IMAGE_TYPE_VALUES,
    FILTERABLE_IMAGE_TYPES,
    normalizeImageType
  };
})();
