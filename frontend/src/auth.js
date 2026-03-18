const AUTH_STORAGE_KEY = 'oneulFarmAuthUser';

export function getAuthUser() {
  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    return null;
  }
}

export function setAuthUser(user) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
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

export async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}
