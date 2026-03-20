const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const MAIN_API_BASE = `${API_BASE_URL}/api/main`;

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data;
}

export async function fetchMainPage() {
  return parseResponse(
    await fetch(MAIN_API_BASE, {
      headers: {
        Accept: "application/json",
      },
    }),
    "메인 데이터를 불러오지 못했습니다."
  );
}
