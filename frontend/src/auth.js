const AUTH_STORAGE_KEY = 'oneulFarmAuthUser';
const AUTH_API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ''
);

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ['/backend'];
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

    let parsedValue = storedValue;
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (error) {
      parsedValue = storedValue;
    }

    const storedAccessToken = sanitizeStoredAuthToken(parsedValue);
    if (!storedAccessToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (typeof parsedValue !== 'object' || parsedValue == null) {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ accessToken: storedAccessToken })
      );
    }

    return hydrateAuthUser(storedAccessToken, parsedValue);
  } catch (error) {
    return null;
  }
}

export function setAuthUser(user) {
  try {
    const storedAccessToken = sanitizeStoredAuthToken(user);
    if (!storedAccessToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      const storedUser =
        user && typeof user === 'object'
          ? {
              accessToken: storedAccessToken,
              userNo: user.userNo ?? null,
              userId: user.userId || '',
              nickname: user.nickname || '',
              role: user.role || '',
              status: user.status || '',
              passwordChangeRequired: Boolean(user.passwordChangeRequired),
            }
          : { accessToken: storedAccessToken };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedUser));
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

function sanitizeStoredAuthToken(value) {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue || null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const accessToken = value.accessToken || value.token || null;
  if (!accessToken) {
    return null;
  }

  return String(accessToken).trim() || null;
}

function hydrateAuthUser(accessToken, storedUser = null) {
  if (!accessToken) {
    return null;
  }

  const claims = parseJwtClaims(accessToken);
  return {
    accessToken,
    userNo: normalizeNumericClaim(storedUser?.userNo ?? claims?.userNo ?? claims?.sub),
    userId: String(storedUser?.userId || claims?.userId || ''),
    nickname: String(storedUser?.nickname || claims?.nickname || ''),
    role: String(storedUser?.role || claims?.role || ''),
    status: String(storedUser?.status || claims?.status || ''),
    passwordChangeRequired: Boolean(
      storedUser?.passwordChangeRequired ?? claims?.passwordChangeRequired
    ),
  };
}

function parseJwtClaims(token) {
  try {
    const tokenParts = String(token || '').split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const normalizedPayload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, '=');

    const decodedPayload = window.atob(normalizedPayload);
    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
}

function normalizeNumericClaim(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
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
  return Boolean(getAccessToken(user));
}

export function isAdminUser(user = getAuthUser()) {
  const normalizedRole = String(user?.role || '').toUpperCase();
  return normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

export function isSuperAdminUser(user = getAuthUser()) {
  return String(user?.role || '').toUpperCase() === 'SUPER_ADMIN';
}

export function requiresPasswordChange(user = getAuthUser()) {
  return Boolean(user?.passwordChangeRequired);
}

export function getPostLoginHash(user = getAuthUser()) {
  if (requiresPasswordChange(user)) {
    return '#/password-change';
  }

  if (isAdminUser(user)) {
    return '#/admin';
  }

  return '#/';
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
