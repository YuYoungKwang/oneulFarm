const API_BASE_PREFIXES = buildApiBasePrefixes(process.env.REACT_APP_API_BASE_URL || "");

const MAIN_API_PATH = "/api/main";
const MAIN_RECOMMENDATIONS_API_PATH = "/api/main/recommendations";
const MAIN_RECOMMENDATIONS_CACHE_KEY = "oneulfarm.mainRecommendations.v2";
const MAIN_RECOMMENDATIONS_CACHE_TTL_MS = 3 * 60 * 1000;

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ["/backend", ""];
}

function normalizeBaseUrl(value) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.replace(/\/+$/, "");
}

function readCachedPayload(cacheKey, ttlMs) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(cacheKey);
    if (!rawValue) {
      return null;
    }

    const cachedValue = JSON.parse(rawValue);
    const cachedAt = Number(cachedValue?.cachedAt || 0);
    if (!cachedAt || Date.now() - cachedAt > ttlMs) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }

    return cachedValue?.payload ?? null;
  } catch (error) {
    window.sessionStorage.removeItem(cacheKey);
    return null;
  }
}

function writeCachedPayload(cacheKey, payload) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      })
    );
  } catch (error) {
    // Ignore cache write failures and continue with network data only.
  }
}

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data;
}

async function requestMainApi(path, options, fallbackMessage) {
  let lastError = null;

  for (const basePrefix of API_BASE_PREFIXES) {
    try {
      const response = await fetch(`${basePrefix}${path}`, options);
      const contentType = response.headers.get("content-type") || "";
      const isJsonResponse = contentType.includes("application/json");

      if (response.status === 404 || response.status === 405) {
        lastError = new Error(fallbackMessage);
        continue;
      }

      if (!isJsonResponse) {
        const responseText = await response.text().catch(() => "");
        if (responseText.trim().startsWith("<")) {
          lastError = new Error(fallbackMessage);
          continue;
        }

        throw new Error(fallbackMessage);
      }

      return await parseResponse(response, fallbackMessage);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(fallbackMessage);
}

export async function fetchMainPage() {
  return requestMainApi(
    MAIN_API_PATH,
    {
      headers: {
        Accept: "application/json",
      },
    },
    "\uBA54\uC778 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
  );
}

export async function fetchMainRecommendations() {
  const cachedPayload = readCachedPayload(
    MAIN_RECOMMENDATIONS_CACHE_KEY,
    MAIN_RECOMMENDATIONS_CACHE_TTL_MS
  );
  if (cachedPayload) {
    return cachedPayload;
  }

  const payload = await requestMainApi(
    MAIN_RECOMMENDATIONS_API_PATH,
    {
      headers: {
        Accept: "application/json",
      },
    },
    "\uBA54\uC778 \uCD94\uCC9C \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
  );
  writeCachedPayload(MAIN_RECOMMENDATIONS_CACHE_KEY, payload);
  return payload;
}
