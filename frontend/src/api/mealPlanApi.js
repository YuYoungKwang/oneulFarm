import { requestAuthApi } from '../auth';

function buildLocalDemoReply(message) {
  const normalizedMessage = String(message || '').trim();
  const ingredientHint = normalizedMessage.includes('감자')
    ? '감자'
    : normalizedMessage.includes('버섯')
      ? '버섯'
      : normalizedMessage.includes('고추')
        ? '고추'
        : '냉장고 재료';

  return [
    '오늘 추천',
    `- ${ingredientHint}를 중심으로 한 끼 식단부터 가볍게 시작해보세요.`,
    '- 메인 메뉴 1개와 곁들임 메뉴 1개로 묶으면 장보기가 단순해집니다.',
    '',
    '필요한 재료',
    '- 기본 채소: 양파, 대파, 마늘',
    '- 단백질: 달걀 또는 두부',
    `- 메인 재료: ${ingredientHint}`,
    '',
    '장보기 팁',
    '- 오늘은 데모 응답 모드라 간단한 가이드만 보여드리고 있어요.',
    '- 백엔드와 OpenAI 키가 연결되면 더 구체적인 식단 상담으로 확장됩니다.',
  ].join('\n');
}

export async function requestMealPlanChat({ message, previousResponseId } = {}) {
  try {
    const payload = await requestAuthApi(
      '/api/meal-plan/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          previousResponseId: previousResponseId || null,
        }),
      },
      '맞춤 식단 AI 응답을 불러오지 못했습니다.'
    );

    return payload?.data || {};
  } catch (error) {
    console.warn('meal-plan chat fallback', error);
    return {
      reply: buildLocalDemoReply(message),
      responseId: null,
      model: 'local-demo',
      fallbackMode: true,
    };
  }
}
