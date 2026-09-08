import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isIOSDevice,
  isStandaloneDisplayMode,
  isIOSStandaloneWebApp,
} from './runtimeEnvironment.js';

test('isStandaloneDisplayMode detects navigator.standalone', () => {
  const value = isStandaloneDisplayMode({
    navigatorRef: { standalone: true },
    windowRef: null,
  });

  assert.equal(value, true);
});

test('isStandaloneDisplayMode detects display-mode standalone media query', () => {
  const value = isStandaloneDisplayMode({
    navigatorRef: {},
    windowRef: {
      matchMedia(query) {
        assert.equal(query, '(display-mode: standalone)');
        return { matches: true };
      },
    },
  });

  assert.equal(value, true);
});

test('isIOSDevice matches classic iPad/iPhone user agents', () => {
  assert.equal(isIOSDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }), true);
  assert.equal(isIOSDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), true);
  assert.equal(isIOSDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }), false);
});

test('isIOSDevice detects iPadOS desktop-class user agents via touch-enabled Mac platform', () => {
  const value = isIOSDevice({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  });

  assert.equal(value, true);
});

test('isIOSStandaloneWebApp requires both iOS and standalone mode', () => {
  const yes = isIOSStandaloneWebApp({
    navigatorRef: {
      standalone: true,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    },
    windowRef: null,
  });
  const no = isIOSStandaloneWebApp({
    navigatorRef: {
      standalone: false,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    },
    windowRef: null,
  });

  assert.equal(yes, true);
  assert.equal(no, false);
});

test('isIOSStandaloneWebApp detects desktop-class iPad standalone mode', () => {
  const yes = isIOSStandaloneWebApp({
    navigatorRef: {
      standalone: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    },
    windowRef: null,
  });

  assert.equal(yes, true);
});