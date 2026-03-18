import { useState } from 'react';
import { formatPrice } from './appUtils';

function ProfileDetailView({
  profile,
  profileLoading,
  profileError,
  profileForm,
  profileSubmitting,
  profileSubmitError,
  onProfileFormChange,
  onProfileSubmit,
  onResetProfileForm,
  passwordForm,
  passwordSubmitting,
  passwordError,
  onPasswordFormChange,
  onPasswordSubmit,
  onResetPasswordForm,
  onBack,
  onOpenAddressModal,
}) {
  const [activeEditor, setActiveEditor] = useState(null);

  const infoRows = [
    { key: 'userId', label: '아이디', value: profile.userId || '-', editable: false },
    { key: 'nickname', label: '닉네임', value: profile.nickname || '-', editable: true },
    { key: 'email', label: '이메일', value: profile.email || '-', editable: true },
    { key: 'phone', label: '연락처', value: profile.phone || '-', editable: true },
    {
      key: 'defaultAddress',
      label: '기본 배송지',
      value: profile.defaultAddress || '등록된 기본 배송지가 없습니다.',
      editable: false,
      actionLabel: '배송지 관리',
      onAction: onOpenAddressModal,
    },
    {
      key: 'totalSavedAmount',
      label: '누적 절약 금액',
      value: formatPrice(profile.totalSavedAmount),
      editable: false,
    },
  ];

  async function handleProfileRowSubmit(event) {
    event.preventDefault();
    const success = await onProfileSubmit(event);
    if (success) {
      setActiveEditor(null);
    }
  }

  async function handlePasswordRowSubmit(event) {
    event.preventDefault();
    const success = await onPasswordSubmit(event);
    if (success) {
      setActiveEditor(null);
    }
  }

  function handleCancelProfileEdit() {
    onResetProfileForm();
    setActiveEditor(null);
  }

  function handleCancelPasswordEdit() {
    onResetPasswordForm();
    setActiveEditor(null);
  }

  return (
    <>
      <section className="page-head">
        <div>
          <h1>상세 개인정보</h1>
          <p>한 화면에서 계정 정보를 확인하고, 수정 가능한 항목만 바로 편집할 수 있습니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onBack}>마이페이지로 돌아가기</button>
        </div>
      </section>

      {profileError && <article className="card feedback-card feedback-card--error">{profileError}</article>}

      <section className="section">
        <article className="card profile-inline-card">
          <div className="section-head">
            <div>
              <div className="section-title">{profileLoading ? '불러오는 중...' : (profile.nickname || profile.userId || '-')}</div>
              <div className="section-sub">수정 가능한 항목만 오른쪽 버튼으로 바로 편집합니다.</div>
            </div>
          </div>

          <div className="profile-inline-list">
            {infoRows.map((item) => {
              const isEditing = activeEditor === item.key;

              if (item.key === 'nickname' || item.key === 'email' || item.key === 'phone') {
                return (
                  <div key={item.key} className={`profile-inline-row ${isEditing ? 'is-editing' : ''}`}>
                    <div className="profile-inline-row__label">{item.label}</div>

                    {isEditing ? (
                      <form className="profile-inline-editor" onSubmit={handleProfileRowSubmit}>
                        <div className="profile-inline-editor__field">
                          <input
                            name={item.key}
                            value={profileForm[item.key]}
                            onChange={onProfileFormChange}
                            placeholder={`${item.label}을 입력하세요`}
                          />
                        </div>
                        {profileSubmitError && <div className="form-error">{profileSubmitError}</div>}
                        <div className="profile-inline-row__actions">
                          <button type="button" className="btn-outline" onClick={handleCancelProfileEdit}>취소</button>
                          <button type="submit" className="btn" disabled={profileSubmitting}>
                            {profileSubmitting ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="profile-inline-row__value">{profileLoading ? '불러오는 중...' : item.value}</div>
                        <div className="profile-inline-row__actions">
                          <button type="button" className="btn-outline" onClick={() => setActiveEditor(item.key)}>수정</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              }

              if (item.key === 'password') {
                return null;
              }

              return (
                <div key={item.key} className="profile-inline-row">
                  <div className="profile-inline-row__label">{item.label}</div>
                  <div className="profile-inline-row__value">{profileLoading ? '불러오는 중...' : item.value}</div>
                  <div className="profile-inline-row__actions">
                    {item.onAction && (
                      <button type="button" className="btn-outline" onClick={item.onAction}>
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className={`profile-inline-row ${activeEditor === 'password' ? 'is-editing' : ''}`}>
              <div className="profile-inline-row__label">비밀번호</div>

              {activeEditor === 'password' ? (
                <form className="profile-inline-editor profile-inline-editor--password" onSubmit={handlePasswordRowSubmit}>
                  <div className="form-grid">
                    <label className="form-field form-field--full">
                      <span>현재 비밀번호</span>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={onPasswordFormChange}
                        placeholder="현재 비밀번호"
                      />
                    </label>
                    <label className="form-field">
                      <span>새 비밀번호</span>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={onPasswordFormChange}
                        placeholder="8자 이상 입력"
                      />
                    </label>
                    <label className="form-field">
                      <span>비밀번호 확인</span>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={onPasswordFormChange}
                        placeholder="새 비밀번호 확인"
                      />
                    </label>
                  </div>
                  {passwordError && <div className="form-error">{passwordError}</div>}
                  <div className="profile-inline-row__actions">
                    <button type="button" className="btn-outline" onClick={handleCancelPasswordEdit}>취소</button>
                    <button type="submit" className="btn" disabled={passwordSubmitting}>
                      {passwordSubmitting ? '변경 중...' : '변경'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="profile-inline-row__value">********</div>
                  <div className="profile-inline-row__actions">
                    <button type="button" className="btn-outline" onClick={() => setActiveEditor('password')}>변경</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

export default ProfileDetailView;
