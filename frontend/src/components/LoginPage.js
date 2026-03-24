import React, { useState } from 'react';
import { requestAuthApi, setAuthUser } from '../auth';
import { buildSocialCallbackUri, createSocialLoginState } from '../socialAuth';
import '../styles/user.css';

const INITIAL_FIND_ID_FORM = {
  email: '',
  phone: '',
};

const INITIAL_RESET_PASSWORD_FORM = {
  email: '',
};

function LoginPage() {
  const [form, setForm] = useState({
    userId: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isFindIdOpen, setIsFindIdOpen] = useState(false);
  const [findIdForm, setFindIdForm] = useState(INITIAL_FIND_ID_FORM);
  const [findIdError, setFindIdError] = useState('');
  const [foundUserId, setFoundUserId] = useState('');
  const [findingId, setFindingId] = useState(false);

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState(INITIAL_RESET_PASSWORD_FORM);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');
  const [sendingTemporaryPassword, setSendingTemporaryPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFindIdChange(event) {
    const { name, value } = event.target;
    setFindIdForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleResetPasswordChange(event) {
    const { name, value } = event.target;
    setResetPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = await requestAuthApi(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
        '로그인에 실패했습니다.'
      );

      if (payload.data) {
        setAuthUser(payload.data);
        window.location.hash = payload.data.passwordChangeRequired
          ? '#/password-change'
          : '#/';
      }
    } catch (requestError) {
      setError(requestError.message || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFindIdSubmit(event) {
    event.preventDefault();
    setFindingId(true);
    setFindIdError('');
    setFoundUserId('');

    try {
      const payload = await requestAuthApi(
        '/api/auth/find-userid',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(findIdForm),
        },
        '아이디를 찾지 못했습니다.'
      );

      const resolvedUserId = payload?.data?.userId || '';
      setFoundUserId(resolvedUserId);
      setForm((current) => ({
        ...current,
        userId: resolvedUserId,
      }));
    } catch (requestError) {
      setFindIdError(requestError.message || '아이디를 찾지 못했습니다.');
    } finally {
      setFindingId(false);
    }
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    setSendingTemporaryPassword(true);
    setResetPasswordError('');
    setResetPasswordSuccess('');

    try {
      await requestAuthApi(
        '/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resetPasswordForm),
        },
        '임시 비밀번호를 전송하지 못했습니다.'
      );

      setResetPasswordSuccess(
        '입력하신 이메일로 임시 비밀번호를 전송했습니다. 이메일에서 임시 비밀번호로 로그인해 주세요.'
      );
      setForm((current) => ({
        ...current,
        userId: resetPasswordForm.email,
        password: '',
      }));
    } catch (requestError) {
      setResetPasswordError(requestError.message || '임시 비밀번호를 전송하지 못했습니다.');
    } finally {
      setSendingTemporaryPassword(false);
    }
  }

  function openFindIdModal() {
    setFindIdForm(INITIAL_FIND_ID_FORM);
    setFindIdError('');
    setFoundUserId('');
    setIsFindIdOpen(true);
  }

  function closeFindIdModal() {
    setIsFindIdOpen(false);
    setFindIdError('');
    setFoundUserId('');
    setFindingId(false);
  }

  function openResetPasswordModal() {
    setResetPasswordForm(INITIAL_RESET_PASSWORD_FORM);
    setResetPasswordError('');
    setResetPasswordSuccess('');
    setIsResetPasswordOpen(true);
  }

  function closeResetPasswordModal() {
    setIsResetPasswordOpen(false);
    setResetPasswordError('');
    setResetPasswordSuccess('');
    setSendingTemporaryPassword(false);
  }

  function goToSignup() {
    window.location.hash = '#/signup';
  }

  function handleKakaoLogin() {
    const restApiKey = process.env.REACT_APP_KAKAO_REST_API_KEY || '';
    const redirectUri =
      process.env.REACT_APP_KAKAO_REDIRECT_URI || buildSocialCallbackUri('kakao');
    const state = createSocialLoginState('kakao');

    if (!restApiKey) {
      window.alert('카카오 로그인 설정이 아직 없습니다.');
      return;
    }

    const kakaoUrl =
      'https://kauth.kakao.com/oauth/authorize' +
      `?client_id=${restApiKey}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = kakaoUrl;
  }

  function handleNaverLogin() {
    const clientId = process.env.REACT_APP_NAVER_CLIENT_ID || '';
    const redirectUri =
      process.env.REACT_APP_NAVER_REDIRECT_URI || buildSocialCallbackUri('naver');
    const state = createSocialLoginState('naver');

    if (!clientId) {
      window.alert('네이버 로그인 설정이 아직 없습니다.');
      return;
    }

    const naverUrl =
      'https://nid.naver.com/oauth2.0/authorize' +
      `?response_type=code&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;

    window.location.href = naverUrl;
  }

  function handleGoogleLogin() {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
    const redirectUri =
      process.env.REACT_APP_GOOGLE_REDIRECT_URI || buildSocialCallbackUri('google');
    const state = createSocialLoginState('google');

    if (!clientId) {
      window.alert('구글 로그인 설정이 아직 없습니다.');
      return;
    }

    const googleUrl =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = googleUrl;
  }

  return (
    <div className="page-shell">
      <main className="container">
        <section className="auth-wrap">
          <article className="auth-brand">
            <span className="eyebrow">oneulFarm 로그인</span>
            <h1>
              오늘의 식재료,
              <br />
              <span className="accent">더 똑똑하게 비교해요</span>
            </h1>
            <p className="muted">
              로그인하면 장바구니, 주문 내역, 비밀번호 재설정 흐름을 한 번에 관리할 수
              있습니다.
            </p>

            <ul>
              <li>장바구니와 주문 내역 확인</li>
              <li>임시 비밀번호 발급 및 변경</li>
              <li>구매 이력 기반 맞춤 추천 준비</li>
            </ul>
          </article>

          <article className="auth-form">
            <div className="card-title" style={{ fontSize: '28px', marginBottom: '24px' }}>
              로그인
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>아이디 또는 이메일</label>
                <input
                  className="input"
                  type="text"
                  name="userId"
                  placeholder="아이디 또는 이메일을 입력해 주세요"
                  value={form.userId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label>비밀번호</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  placeholder="비밀번호를 입력해 주세요"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="help-row">
                <span className="help-link" role="button" tabIndex={0} onClick={openFindIdModal}>
                  아이디 찾기
                </span>
                <span
                  className="help-link"
                  role="button"
                  tabIndex={0}
                  onClick={openResetPasswordModal}
                >
                  비밀번호 찾기
                </span>
              </div>

              {error ? <div className="notice">{error}</div> : null}

              <button
                className="btn"
                type="submit"
                style={{ width: '100%', marginTop: '20px' }}
                disabled={submitting}
              >
                {submitting ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="auth-divider">간편 로그인</div>

            <div className="social-grid">
              <button className="social-btn kakao" type="button" onClick={handleKakaoLogin}>
                카카오
              </button>
              <button className="social-btn naver" type="button" onClick={handleNaverLogin}>
                네이버
              </button>
              <button className="social-btn google" type="button" onClick={handleGoogleLogin}>
                구글
              </button>
            </div>

            <p className="card-sub" style={{ marginTop: '18px', textAlign: 'center' }}>
              아직 계정이 없나요?{' '}
              <span
                onClick={goToSignup}
                style={{ color: 'var(--green)', fontWeight: 800, cursor: 'pointer' }}
              >
                회원가입
              </span>
            </p>
          </article>
        </section>
      </main>

      {isFindIdOpen ? (
        <div className="auth-modal-backdrop" onClick={closeFindIdModal}>
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal__head">
              <div>
                <div className="card-title">아이디 찾기</div>
                <div className="card-sub">이메일과 연락처를 입력해 주세요</div>
              </div>
              <button className="btn-outline" type="button" onClick={closeFindIdModal}>
                닫기
              </button>
            </div>

            <form onSubmit={handleFindIdSubmit}>
              <div className="field">
                <label>이메일</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  placeholder="example@domain.com"
                  value={findIdForm.email}
                  onChange={handleFindIdChange}
                  required
                />
              </div>

              <div className="field">
                <label>연락처</label>
                <input
                  className="input"
                  type="text"
                  name="phone"
                  placeholder="010-0000-0000"
                  value={findIdForm.phone}
                  onChange={handleFindIdChange}
                  required
                />
              </div>

              {findIdError ? <div className="notice">{findIdError}</div> : null}

              {foundUserId ? (
                <div className="auth-result">
                  찾은 아이디 <strong>{foundUserId}</strong>
                </div>
              ) : null}

              <div className="page-actions" style={{ marginTop: '20px' }}>
                <button className="btn" type="submit" disabled={findingId}>
                  {findingId ? '조회 중...' : '아이디 찾기'}
                </button>
                {foundUserId ? (
                  <button className="btn-outline" type="button" onClick={closeFindIdModal}>
                    확인
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isResetPasswordOpen ? (
        <div className="auth-modal-backdrop" onClick={closeResetPasswordModal}>
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal__head">
              <div>
                <div className="card-title">비밀번호 찾기</div>
                <div className="card-sub">이메일로 임시 비밀번호를 발급합니다</div>
              </div>
              <button className="btn-outline" type="button" onClick={closeResetPasswordModal}>
                닫기
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="field">
                <label>이메일</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  placeholder="example@domain.com"
                  value={resetPasswordForm.email}
                  onChange={handleResetPasswordChange}
                  required
                />
              </div>

              {resetPasswordError ? <div className="notice">{resetPasswordError}</div> : null}
              {resetPasswordSuccess ? (
                <div className="auth-result">{resetPasswordSuccess}</div>
              ) : null}

              <div className="page-actions" style={{ marginTop: '20px' }}>
                <button className="btn" type="submit" disabled={sendingTemporaryPassword}>
                  {sendingTemporaryPassword ? '전송 중...' : '임시 비밀번호 받기'}
                </button>
                {resetPasswordSuccess ? (
                  <button className="btn-outline" type="button" onClick={closeResetPasswordModal}>
                    확인
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LoginPage;
