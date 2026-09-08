function normalizeNavigatorInput(input) {
  if (typeof input === 'string') {
    return {
      userAgent: input,
      platform: '',
      maxTouchPoints: 0,
    };
  }

  return {
    userAgent: input?.userAgent ?? globalThis.navigator?.userAgent ?? '',
    platform: input?.platform ?? globalThis.navigator?.platform ?? '',
    maxTouchPoints: input?.maxTouchPoints ?? globalThis.navigator?.maxTouchPoints ?? 0,
  };
}

export function isStandaloneDisplayMode({ windowRef = globalThis.window, navigatorRef = globalThis.navigator } = {}) {
  if (navigatorRef?.standalone === true) {
    return true;
  }

  if (typeof windowRef?.matchMedia === 'function') {
    try {
      return windowRef.matchMedia('(display-mode: standalone)').matches === true;
    } catch {
      return false;
    }
  }

  return false;
}

export function isIOSDevice(navigatorLike = globalThis.navigator) {
  const { userAgent, platform, maxTouchPoints } = normalizeNavigatorInput(navigatorLike);
  const ua = String(userAgent);

  if (/iPad|iPhone|iPod/i.test(ua)) {
    return true;
  }

  return /Mac/i.test(String(platform)) && Number(maxTouchPoints) > 1;
}

export function isIOSStandaloneWebApp({ windowRef = globalThis.window, navigatorRef = globalThis.navigator } = {}) {
  return isIOSDevice(navigatorRef) && isStandaloneDisplayMode({ windowRef, navigatorRef });
}