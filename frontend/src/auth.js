const AUTH_STORAGE_KEY = 'oneulFarmAuthUser';
const AUTH_API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ''
);

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ['', '/backend'];
}

function normalizeBaseUrl(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.replace(/\/+$/, '');
}

export function getAuthUser() {
  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (!parsedValue.accessToken && !parsedValue.token) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsedValue;
  } catch (error) {
    return null;
  }
}

export function setAuthUser(user) {
  try {
    if (!user || typeof user !== 'object') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(
      new CustomEvent('oneulFarm:storage-change', {
        detail: { key: AUTH_STORAGE_KEY },
      })
    );
  } catch (error) {
    // Ignore storage failures in local preview.
  }
}

export function clearAuthUser() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('oneulFarm:storage-change', {
        detail: { key: AUTH_STORAGE_KEY },
      })
    );
  } catch (error) {
    // Ignore storage failures in local preview.
  }
}

export function getAccessToken(user = getAuthUser()) {
  return user?.accessToken || user?.token || null;
}

export function isAuthenticated(user = getAuthUser()) {
  return Boolean(user?.userNo && getAccessToken(user));
}

export function requiresPasswordChange(user = getAuthUser()) {
  return Boolean(user?.passwordChangeRequired);
}

export function buildAuthHeaders({
  includeJson = false,
  includeUserNo = true,
  user = getAuthUser(),
} = {}) {
  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const accessToken = getAccessToken(user);
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (includeUserNo && user?.userNo != null) {
    headers['X-USER-NO'] = String(user.userNo);
  }

  return headers;
}

export async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401) {
      clearAuthUser();
    }

    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

export async function requestAuthApi(path, options, fallbackMessage) {
  let lastError = null;

  for (const basePrefix of AUTH_API_BASE_PREFIXES) {
    try {
      const response = await fetch(`${basePrefix}${path}`, options);
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');

      if (response.status === 404 || response.status === 405) {
        lastError = new Error(fallbackMessage);
        continue;
      }

      if (!isJsonResponse) {
        const responseText = await response.text().catch(() => '');
        if (responseText.trim().startsWith('<')) {
          lastError = new Error(fallbackMessage);
          continue;
        }

        throw new Error(fallbackMessage);
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        if (response.status === 401) {
          clearAuthUser();
        }

        throw new Error(payload?.message || fallbackMessage);
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(fallbackMessage);
}
