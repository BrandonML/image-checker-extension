const test = require('node:test');
const assert = require('node:assert');

// Mock environment
global.window = {
  imageDetailsOverlayApiOnly: true,
  location: { href: 'http://localhost' },
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  innerHeight: 1000,
  pageYOffset: 0,
  pageXOffset: 0
};
global.document = {
  documentElement: {
    clientHeight: 1000,
    scrollTop: 0,
    scrollLeft: 0,
    scrollWidth: 1000,
    scrollHeight: 1000
  },
  body: {
    scrollWidth: 1000,
    scrollHeight: 1000
  },
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    classList: { add: () => {} },
    getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 })
  }),
  addEventListener: () => {}
};
global.chrome = {
  storage: {
    local: {
      get: (key, cb) => cb({})
    }
  },
  runtime: {
    sendMessage: () => {},
    lastError: null
  }
};
global.HTMLImageElement = class {};
global.Element = class {};
global.MutationObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
};
global.ResizeObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
};
global.PerformanceResourceTiming = class {};
global.performance = {
  getEntriesByName: () => [],
};
global.TextEncoder = class {
  encode(str) {
    return { length: Buffer.byteLength(str) };
  }
};
global.fetch = () => Promise.resolve({ ok: false });

// Load the script
require('./imageDetails.js');

const { parseAspectRatioValue } = window.imageDetailsAPI;

test('parseAspectRatioValue tests', async (t) => {
  await t.test('should return 1 for "1:1"', () => {
    assert.strictEqual(parseAspectRatioValue('1:1'), 1);
  });

  await t.test('should return 4/3 for "4:3"', () => {
    assert.strictEqual(parseAspectRatioValue('4:3'), 4 / 3);
  });

  await t.test('should return 16/9 for "16:9"', () => {
    assert.strictEqual(parseAspectRatioValue('16:9'), 16 / 9);
  });

  await t.test('should return 21/9 for "21:9"', () => {
    assert.strictEqual(parseAspectRatioValue('21:9'), 21 / 9);
  });

  await t.test('should return null for unsupported ratio "1:2"', () => {
    assert.strictEqual(parseAspectRatioValue('1:2'), null);
  });

  await t.test('should return null for non-ratio string "random"', () => {
    assert.strictEqual(parseAspectRatioValue('random'), null);
  });

  await t.test('should return null for null input', () => {
    assert.strictEqual(parseAspectRatioValue(null), null);
  });

  await t.test('should return null for undefined input', () => {
    assert.strictEqual(parseAspectRatioValue(undefined), null);
  });

  await t.test('should return null for empty string', () => {
    assert.strictEqual(parseAspectRatioValue(''), null);
  });
});
