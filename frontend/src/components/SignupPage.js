import React, { useState } from 'react';
import { parseApiResponse, setAuthUser } from '../auth';
import '../styles/user.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const AUTH_API_BASE = `${API_BASE_URL}/api/auth`;

const INITIAL_FORM = {
  userId: '',
  email: '',
  nickname: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  agreeTerms: false,
};

const INITIAL_DUPLICATE_STATUS = {
  userId: { checked: false, available: false, message: '' },
  email: { checked: false, available: false, message: '' },
  nickname: { checked: false, available: false, message: '' },
};

export default function SignupPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [duplicateStatus, setDuplicateStatus] = useState(INITIAL_DUPLICATE_STATUS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'userId' || name === 'email' || name === 'nickname') {
      setDuplicateStatus((current) => ({
        ...current,
        [name]: { checked: false, available: false, message: '' },
      }));
    }
  }

  async function checkDuplicate(field) {
    const value = form[field]?.trim();
    if (!value) {
      return false;
    }

    const queryKey =
      field === 'userId' ? 'userId' : field === 'email' ? 'email' : 'nickname';
    const endpoint =
      field === 'userId' ? 'check-userid' : field === 'email' ? 'check-email' : 'check-nickname';

    try {
      const response = await fetch(
        `${AUTH_API_BASE}/${endpoint}?${new URLSearchParams({ [queryKey]: value }).toString()}`
      );
      const payload = await parseApiResponse(response, '중복 확인에 실패했습니다.');
      const available = Boolean(payload.data?.available);
      const nextMessage = available
        ? '사용 가능한 값입니다.'
        : `${field === 'userId' ? '아이디' : field === 'email' ? '이메일' : '닉네임'}가 이미 사용 중입니다.`;

      setDuplicateStatus((current) => ({
        ...current,
        [field]: {
          checked: true,
          available,
          message: nextMessage,
        },
      }));

      return available;
    } catch (requestError) {
      const message = requestError.message || '중복 확인에 실패했습니다.';
      setDuplicateStatus((current) => ({
        ...current,
        [field]: {
          checked: true,
          available: false,
          message,
        },
      }));
      return false;
    }
  }

  async function ensureDuplicateChecks() {
    const fields = ['userId', 'email', 'nickname'];

    for (const field of fields) {
      const currentValue = form[field]?.trim();
      if (!currentValue) {
        setError('아이디, 이메일, 닉네임을 모두 입력해 주세요.');
        return false;
      }

      if (!duplicateStatus[field].checked) {
        const available = await checkDuplicate(field);
        if (!available) {
          setError(duplicateStatus[field].message || '중복된 값이 있습니다.');
          return false;
        }
      } else if (!duplicateStatus[field].available) {
        setError(duplicateStatus[field].message || '중복된 값이 있습니다.');
        return false;
      }
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (!form.agreeTerms) {
      setError('개인정보 처리방침에 동의해 주세요.');
      return;
    }

    const duplicateCheckPassed = await ensureDuplicateChecks();
    if (!duplicateCheckPassed) {
      return;
    }

    setSubmitting(true);

    try {
      const signupResponse = await fetch(`${AUTH_API_BASE}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: form.userId.trim(),
          email: form.email.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
          phone: form.phone.trim(),
        }),
      });

      await parseApiResponse(signupResponse, '회원가입에 실패했습니다.');

      const loginResponse = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: form.userId.trim(),
          password: form.password,
        }),
      });

      const loginPayload = await parseApiResponse(loginResponse, '회원가입 후 로그인에 실패했습니다.');
      if (loginPayload.data) {
        setAuthUser(loginPayload.data);
      }

      window.location.hash = '#/mypage';
    } catch (requestError) {
      setError(requestError.message || '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function goToLogin() {
    window.location.hash = '#/login';
  }

  function renderDuplicateMessage(field) {
    const status = duplicateStatus[field];
    if (!status.message) {
      return null;
    }

    return (
      <div
        className="small"
        style={{ color: status.available ? 'var(--green-dark)' : '#b42318' }}
      >
        {status.message}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <main className="container">
        <section className="auth-wrap">
          <article className="auth-brand">
            <span className="eyebrow">oneulFarm 회원가입</span>
            <h1>
              절약 리포트를
              <br />
              <span className="accent">지금 바로 시작하세요</span>
            </h1>

            <p className="muted">
              가입 후 구매 데이터와 주문 정보를 바탕으로 절약 금액과 추천 상품을 바로 확인할 수 있습니다.
            </p>

            <div className="quick-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '28px' }}>
              <div className="quick-card soft-green">
                <div className="quick-label">절약 대시보드</div>
                <div className="quick-value">자동 집계</div>
              </div>

              <div className="quick-card soft-yellow">
                <div className="quick-label">맞춤 추천</div>
                <div className="quick-value">구매 이력 기반</div>
              </div>
            </div>
          </article>

          <article className="auth-form">
            <div className="card-title" style={{ fontSize: '28px' }}>회원가입</div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>이메일</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => checkDuplicate('email')}
                  placeholder="oneulfarm@example.com"
                  required
                />
                {renderDuplicateMessage('email')}
              </div>

              <div className="field">
                <label>아이디</label>
                <input
                  className="input"
                  type="text"
                  name="userId"
                  value={form.userId}
                  onChange={handleChange}
                  onBlur={() => checkDuplicate('userId')}
                  placeholder="아이디를 입력해 주세요"
                  required
                />
                {renderDuplicateMessage('userId')}
              </div>

              <div className="field">
                <label>닉네임</label>
                <input
                  className="input"
                  type="text"
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  onBlur={() => checkDuplicate('nickname')}
                  placeholder="서비스에서 사용할 닉네임"
                  required
                />
                {renderDuplicateMessage('nickname')}
              </div>

              <div className="field">
                <label>휴대폰 번호</label>
                <input
                  className="input"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="010-0000-0000"
                  required
                />
              </div>

              <div className="field">
                <label>비밀번호</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력해 주세요"
                  required
                />
              </div>

              <div className="field">
                <label>비밀번호 확인</label>
                <input
                  className="input"
                  type="password"
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력해 주세요"
                  required
                />
              </div>

              <div className="help-row">
                <label>
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={form.agreeTerms}
                    onChange={handleChange}
                  />
                  개인정보 처리방침에 동의합니다.
                </label>
              </div>

              {error ? <div className="notice">{error}</div> : null}

              <button className="btn" type="submit" style={{ width: '100%', marginTop: '18px' }} disabled={submitting}>
                {submitting ? '가입 처리 중...' : '가입하기'}
              </button>
            </form>

            <p className="card-sub" style={{ marginTop: '18px', textAlign: 'center' }}>
              이미 계정이 있나요?{' '}
              <span
                onClick={goToLogin}
                style={{ color: 'var(--green)', fontWeight: 800, cursor: 'pointer' }}
              >
                로그인
              </span>
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
