import '@testing-library/jest-dom';

// Polyfill TextEncoder for MSW
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill BroadcastChannel for MSW
global.BroadcastChannel = class BroadcastChannel {
  constructor() {}
  postMessage() {}
  close() {}
  onmessage = null;
  onmessageerror = null;
};

// Polyfill WritableStream for MSW
global.WritableStream = class WritableStream {
  constructor() {}
  getWriter() {
    return {
      write: () => Promise.resolve(),
      close: () => Promise.resolve(),
      abort: () => Promise.resolve(),
      ready: Promise.resolve(),
      closed: Promise.resolve(),
    };
  }
  abort() {}
  close() {}
};

// Polyfill TransformStream for MSW
global.TransformStream = class TransformStream {
  constructor() {
    this.readable = {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: () => {},
      }),
    };
    this.writable = {
      getWriter: () => ({
        write: () => Promise.resolve(),
        close: () => Promise.resolve(),
        abort: () => Promise.resolve(),
        ready: Promise.resolve(),
        closed: Promise.resolve(),
      }),
    };
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};
