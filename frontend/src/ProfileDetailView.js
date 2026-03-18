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
  passwordForm,
  passwordSubmitting,
  passwordError,
  onPasswordFormChange,
  onPasswordSubmit,
  onBack,
  onOpenAddressModal,
}) {
  const readonlyItems = [
    { label: '회원번호', value: profile.userNo || '-' },
    { label: '아이디', value: profile.userId || '-' },
    { label: '기본 배송지', value: profile.defaultAddress || '등록된 기본 배송지가 없습니다.' },
    { label: '누적 절약 금액', value: formatPrice(profile.totalSavedAmount) },
  ];

  return (
    <>
      <section className="page-head">
        <div>
          <h1>상세 개인정보</h1>
          <p>조회 가능한 정보는 모두 확인하고, 수정 가능한 항목만 분리해서 관리하는 페이지입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onBack}>마이페이지로 돌아가기</button>
          <button type="button" className="btn" onClick={onOpenAddressModal}>배송지 관리</button>
        </div>
      </section>

      {profileError && <article className="card feedback-card feedback-card--error">{profileError}</article>}

      <section className="section profile-detail-hero">
        <article className="card profile-detail-hero__card">
          <div className="profile-detail-hero__top">
            <div>
              <div className="section-title">{profileLoading ? '불러오는 중...' : (profile.nickname || profile.userId || '-')}</div>
              <div className="section-sub">읽기 전용 정보와 수정 가능한 정보를 분리해서 보여줍니다.</div>
            </div>
            <div className="profile-detail-hero__meta">
              <span className="badge green">아이디 @{profile.userId || '-'}</span>
              <span className="badge green">연락처 {profile.phone || '-'}</span>
            </div>
          </div>

          <div className="profile-readonly-grid">
            {readonlyItems.map((item) => (
              <div key={item.label} className="profile-readonly-card">
                <strong>{item.label}</strong>
                <span>{profileLoading ? '불러오는 중...' : item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section grid-2 profile-detail-layout">
        <article className="card">
          <div className="section-head">
            <div>
              <div className="section-title">표시 정보</div>
              <div className="section-sub">계정에서 확인 가능한 현재 정보를 한 번에 보여줍니다.</div>
            </div>
          </div>

          <div className="insight-list profile-display-list">
            <div className="insight-item">
              <strong>닉네임</strong>
              <span>{profileLoading ? '불러오는 중...' : (profile.nickname || '-')}</span>
            </div>
            <div className="insight-item">
              <strong>이메일</strong>
              <span>{profileLoading ? '불러오는 중...' : (profile.email || '-')}</span>
            </div>
            <div className="insight-item">
              <strong>연락처</strong>
              <span>{profileLoading ? '불러오는 중...' : (profile.phone || '-')}</span>
            </div>
            <div className="insight-item">
              <strong>아이디</strong>
              <span>{profileLoading ? '불러오는 중...' : (profile.userId || '-')}</span>
            </div>
            <div className="insight-item">
              <strong>기본 배송지</strong>
              <span>{profileLoading ? '불러오는 중...' : (profile.defaultAddress || '등록된 기본 배송지가 없습니다.')}</span>
            </div>
            <div className="insight-item">
              <strong>누적 절약 금액</strong>
              <span>{profileLoading ? '불러오는 중...' : formatPrice(profile.totalSavedAmount)}</span>
            </div>
          </div>
        </article>

        <div className="stack">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="section-title">수정 가능한 개인정보</div>
                <div className="section-sub">닉네임, 이메일, 연락처만 수정할 수 있습니다.</div>
              </div>
            </div>

            <form className="profile-form" onSubmit={onProfileSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>닉네임</span>
                  <input
                    name="nickname"
                    value={profileForm.nickname}
                    onChange={onProfileFormChange}
                    placeholder="닉네임을 입력하세요"
                  />
                </label>
                <label className="form-field">
                  <span>이메일</span>
                  <input
                    name="email"
                    value={profileForm.email}
                    onChange={onProfileFormChange}
                    placeholder="이메일을 입력하세요"
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>연락처</span>
                  <input
                    name="phone"
                    value={profileForm.phone}
                    onChange={onProfileFormChange}
                    placeholder="연락처를 입력하세요"
                  />
                </label>
              </div>

              {profileSubmitError && <div className="form-error">{profileSubmitError}</div>}

              <div className="modal-actions">
                <button type="submit" className="btn" disabled={profileSubmitting}>
                  {profileSubmitting ? '저장 중...' : '개인정보 저장'}
                </button>
              </div>
            </form>
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <div className="section-title">비밀번호 변경</div>
                <div className="section-sub">현재 비밀번호 확인 후 새 비밀번호로 변경합니다.</div>
              </div>
            </div>

            <form className="profile-form" onSubmit={onPasswordSubmit}>
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

              <div className="modal-actions">
                <button type="submit" className="btn" disabled={passwordSubmitting}>
                  {passwordSubmitting ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </>
  );
}

export default ProfileDetailView;
