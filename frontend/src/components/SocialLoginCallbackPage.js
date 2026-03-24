import { useEffect, useState } from 'react';
import { requestAuthApi, setAuthUser } from '../auth';
import {
  consumeSocialLoginState,
  replaceAppLocation,
  resolveSocialCallbackContext,
} from '../socialAuth';
import '../styles/user.css';

const PROVIDER_LABELS = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

function buildFallbackMessage(provider) {
  const label = PROVIDER_LABELS[provider] || '소셜';
  return `${label} 로그인 처리에 실패했습니다.`;
}

export default function SocialLoginCallbackPage({ callbackContext }) {
  const resolvedContext = callbackContext || resolveSocialCallbackContext();
  const provider = resolvedContext?.provider || '';
  const basePath = resolvedContext?.basePath || '';
  const providerLabel = PROVIDER_LABELS[provider] || '소셜';
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resolvedContext) {
      setError('유효하지 않은 소셜 로그인 콜백입니다.');
      return undefined;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const providerError = searchParams.get('error');
    const providerErrorDescription = searchParams.get('error_description');
    const authorizationCode = searchParams.get('code') || '';
    const state = searchParams.get('state') || '';

    if (providerError) {
      setError(providerErrorDescription || buildFallbackMessage(provider));
      return undefined;
    }

    if (state && !consumeSocialLoginState(provider, state)) {
      setError('소셜 로그인 상태 검증에 실패했습니다. 다시 시도해 주세요.');
      return undefined;
    }

    if (!authorizationCode) {
      setError('인가 코드가 없어 소셜 로그인을 완료할 수 없습니다.');
      return undefined;
    }

    let cancelled = false;

    async function completeSocialLogin() {
      try {
        const payload = await requestAuthApi(
          `/api/auth/social/${provider}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: authorizationCode,
              state,
              redirectUri: `${window.location.origin}${window.location.pathname}`,
            }),
          },
          buildFallbackMessage(provider)
        );

        if (cancelled || !payload.data) {
          return;
        }

        setAuthUser(payload.data);
        replaceAppLocation(
          basePath,
          payload.data.passwordChangeRequired ? '#/password-change' : '#/'
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || buildFallbackMessage(provider));
        }
      }
    }

    completeSocialLogin();

    return () => {
      cancelled = true;
    };
  }, [basePath, provider, resolvedContext]);

  return (
    <div className="page-shell">
      <main className="container">
        <section className="auth-wrap auth-wrap--single">
          <article className="auth-form auth-form--focused">
            <span className="eyebrow">{providerLabel} 로그인</span>
            <div className="card-title" style={{ fontSize: '28px', marginTop: '18px' }}>
              {error ? '로그인에 문제가 생겼습니다.' : '로그인을 완료하고 있습니다.'}
            </div>
            <p className="card-sub" style={{ marginTop: '16px', marginBottom: '24px' }}>
              {error
                ? error
                : `${providerLabel} 계정 인증을 확인한 뒤 oneulFarm 로그인을 마무리하고 있습니다.`}
            </p>

            {error ? (
              <button
                className="btn"
                type="button"
                style={{ width: '100%' }}
                onClick={() => replaceAppLocation(basePath, '#/login')}
              >
                로그인 화면으로 돌아가기
              </button>
            ) : (
              <button className="btn" type="button" style={{ width: '100%' }} disabled>
                로그인 처리 중...
              </button>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
