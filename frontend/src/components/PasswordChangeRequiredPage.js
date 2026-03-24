import { useState } from 'react';
import { buildAuthHeaders, clearAuthUser, requestAuthApi, setAuthUser } from '../auth';
import '../styles/user.css';

export default function PasswordChangeRequiredPage({ authUser }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = await requestAuthApi('/api/auth/password', {
        method: 'PATCH',
        headers: buildAuthHeaders({
          includeJson: true,
          includeUserNo: false,
          user: authUser,
        }),
        body: JSON.stringify(form),
      }, '비밀번호를 변경하지 못했습니다.');
      if (payload.data) {
        setAuthUser(payload.data);
        window.location.hash = '#/';
      }
    } catch (requestError) {
      setError(requestError.message || '비밀번호를 변경하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="container">
        <section className="auth-wrap auth-wrap--single">
          <article className="auth-form auth-form--focused">
            <span className="eyebrow">비밀번호 변경 필요</span>
            <div className="card-title" style={{ fontSize: '28px', marginTop: '18px' }}>
              임시 비밀번호를 변경해 주세요
            </div>
            <p className="card-sub" style={{ marginBottom: '20px' }}>
              임시 비밀번호로 로그인한 계정은 새 비밀번호를 설정하기 전까지 다른 화면을 이용할 수 없습니다.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>현재 비밀번호</label>
                <input
                  className="input"
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="이메일로 받은 임시 비밀번호"
                  required
                />
              </div>

              <div className="field">
                <label>새 비밀번호</label>
                <input
                  className="input"
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호를 입력해 주세요"
                  required
                />
              </div>

              <div className="field">
                <label>새 비밀번호 확인</label>
                <input
                  className="input"
                  type="password"
                  name="newPasswordConfirm"
                  value={form.newPasswordConfirm}
                  onChange={handleChange}
                  placeholder="새 비밀번호를 다시 입력해 주세요"
                  required
                />
              </div>

              {error ? <div className="notice">{error}</div> : null}

              <div className="page-actions" style={{ marginTop: '20px' }}>
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? '변경 중...' : '비밀번호 변경'}
                </button>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    clearAuthUser();
                    window.location.hash = '#/login';
                  }}
                >
                  로그아웃
                </button>
              </div>
            </form>
          </article>
        </section>
      </main>
    </div>
  );
}
