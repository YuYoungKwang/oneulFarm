const SOCIAL_LOGIN_STATE_PREFIX = 'oneulFarmSocialLoginState:';

export function resolveSocialCallbackContext(pathname = window.location.pathname) {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean);
  const oauthIndex = segments.indexOf('oauth');

  if (oauthIndex < 0) {
    return null;
  }

  const provider = segments[oauthIndex + 1];
  const callbackSegment = segments[oauthIndex + 2];
  if (!provider || callbackSegment !== 'callback') {
    return null;
  }

  const baseSegments = segments.slice(0, oauthIndex);
  return {
    provider: provider.toLowerCase(),
    basePath: baseSegments.length ? `/${baseSegments.join('/')}` : '',
  };
}

export function buildSocialCallbackUri(provider, location = window.location) {
  const callbackContext = resolveSocialCallbackContext(location.pathname);
  const basePath = callbackContext?.basePath || normalizeBasePath(location.pathname);
  return `${location.origin}${basePath}/oauth/${provider}/callback`;
}

export function createSocialLoginState(provider) {
  const normalizedProvider = String(provider || '').toLowerCase();
  const state = `${normalizedProvider}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.sessionStorage.setItem(`${SOCIAL_LOGIN_STATE_PREFIX}${normalizedProvider}`, state);
  return state;
}

export function consumeSocialLoginState(provider, state) {
  const normalizedProvider = String(provider || '').toLowerCase();
  const storageKey = `${SOCIAL_LOGIN_STATE_PREFIX}${normalizedProvider}`;
  const expectedState = window.sessionStorage.getItem(storageKey);
  window.sessionStorage.removeItem(storageKey);

  if (!expectedState) {
    return true;
  }

  return normalizeStateValue(expectedState) === normalizeStateValue(state);
}

export function replaceAppLocation(basePath, hash = '') {
  const normalizedBasePath = basePath || '/';
  const nextUrl = `${normalizedBasePath}${hash}`;
  window.history.replaceState(null, '', nextUrl);
  window.dispatchEvent(new Event('hashchange'));
}

function normalizeBasePath(pathname) {
  const trimmedPath = String(pathname || '').replace(/\/+$/, '');
  if (!trimmedPath || trimmedPath === '/') {
    return '';
  }

  return trimmedPath;
}

function normalizeStateValue(value) {
  if (value == null) {
    return '';
  }

  try {
    return decodeURIComponent(String(value));
  } catch (error) {
    return String(value);
  }
}
