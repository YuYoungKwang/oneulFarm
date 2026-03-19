import { useEffect, useState } from 'react';
import { formatPrice } from './appUtils';

const EMPTY_EMAIL_AUTH = {
  requested: false,
  verified: false,
  code: '',
  remainingSeconds: 0,
  tone: '',
  message: '',
};

const EMPTY_PHONE_AUTH = {
  requested: false,
  verified: false,
  code: '',
  remainingSeconds: 0,
  tone: '',
  message: '',
};

function buildProfileImageCandidates(imageUrl) {
  const normalizedUrl = String(imageUrl || '').trim();

  if (!normalizedUrl) {
    return [];
  }

  if (/^https?:\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('data:')) {
    return [normalizedUrl];
  }

  if (normalizedUrl.startsWith('/backend/')) {
    return [normalizedUrl];
  }

  if (normalizedUrl.startsWith('/')) {
    return [`/backend${normalizedUrl}`];
  }

  return [normalizedUrl];
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const seconds = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function MyPageView({
  orders,
  profile,
  profileLoading,
  profileError,
  profileForm,
  profileSubmitting,
  profileSubmitError,
  profileImageUploading,
  profileImageError,
  duplicateState,
  onProfileFormChange,
  onProfileSubmit,
  onProfileImageUpload,
  onResetProfileForm,
  onDuplicateCheck,
  passwordForm,
  passwordSubmitting,
  passwordError,
  onPasswordFormChange,
  onPasswordSubmit,
  onResetPasswordForm,
  withdrawForm,
  withdrawing,
  withdrawError,
  onWithdrawFormChange,
  onWithdrawSubmit,
  onOpenAddressModal,
}) {
  const [activeEditor, setActiveEditor] = useState(null);
  const [emailAuth, setEmailAuth] = useState(EMPTY_EMAIL_AUTH);
  const [phoneAuth, setPhoneAuth] = useState(EMPTY_PHONE_AUTH);
  const [profileGuardError, setProfileGuardError] = useState('');
  const [profileImageCandidateIndex, setProfileImageCandidateIndex] = useState(0);

  useEffect(() => {
    if (activeEditor !== 'email' || !emailAuth.requested || emailAuth.verified || emailAuth.remainingSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setEmailAuth((current) => {
        if (!current.requested || current.verified || current.remainingSeconds <= 1) {
          return {
            ...current,
            requested: false,
            verified: false,
            code: '',
            remainingSeconds: 0,
            tone: 'error',
            message: '인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.',
          };
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeEditor, emailAuth.requested, emailAuth.verified, emailAuth.remainingSeconds]);

  useEffect(() => {
    if (activeEditor !== 'phone' || !phoneAuth.requested || phoneAuth.verified || phoneAuth.remainingSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPhoneAuth((current) => {
        if (!current.requested || current.verified || current.remainingSeconds <= 1) {
          return {
            ...current,
            requested: false,
            verified: false,
            code: '',
            remainingSeconds: 0,
            tone: 'error',
            message: '인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.',
          };
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeEditor, phoneAuth.requested, phoneAuth.verified, phoneAuth.remainingSeconds]);

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
    {
      key: 'totalOrderCount',
      label: '총 주문 건수',
      value: `${orders.length}건`,
      editable: false,
    },
  ];
  const profileInitial = String(profile.nickname || profile.userId || '?')
    .trim()
    .charAt(0)
    .toUpperCase();
  const profileImageCandidates = buildProfileImageCandidates(profile.profileImageUrl);
  const profileImageSrc = profileImageCandidates[profileImageCandidateIndex] || '';

  useEffect(() => {
    setProfileImageCandidateIndex(0);
  }, [profile.profileImageUrl]);

  function resetEmailAuth() {
    setEmailAuth(EMPTY_EMAIL_AUTH);
  }

  function resetPhoneAuth() {
    setPhoneAuth(EMPTY_PHONE_AUTH);
  }

  async function handleProfileImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onProfileImageUpload(file);
    event.target.value = '';
  }

  function handleProfileImageLoadError() {
    setProfileImageCandidateIndex((currentIndex) => {
      if (currentIndex >= profileImageCandidates.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }

  function handleStartEdit(fieldKey) {
    setActiveEditor(fieldKey);
    if (fieldKey === 'email') {
      resetEmailAuth();
    }
    if (fieldKey === 'phone') {
      resetPhoneAuth();
    }
  }

  function handleInlineProfileChange(event) {
    if (event.target.name === 'email') {
      resetEmailAuth();
    }
    if (event.target.name === 'phone') {
      resetPhoneAuth();
    }
    setProfileGuardError('');
    onProfileFormChange(event);
  }

  function handleCancelProfileEdit() {
    onResetProfileForm();
    resetEmailAuth();
    resetPhoneAuth();
    setProfileGuardError('');
    setActiveEditor(null);
  }

  function handleCancelPasswordEdit() {
    onResetPasswordForm();
    setActiveEditor(null);
  }

  function validateProfileFieldBeforeSave(fieldKey) {
    setProfileGuardError('');

    if (fieldKey === 'nickname' || fieldKey === 'email' || fieldKey === 'phone') {
      const currentValue = String(profile[fieldKey] || '').trim();
      const nextValue = String(profileForm[fieldKey] || '').trim();

      if (nextValue === currentValue) {
        setProfileGuardError('변경된 내용이 없습니다. 값을 수정한 뒤 저장해 주세요.');
        setActiveEditor(fieldKey);
        return false;
      }
    }

    if (fieldKey === 'nickname') {
      const currentValue = String(profile.nickname || '').trim();
      const nextValue = String(profileForm.nickname || '').trim();
      const nicknameState = duplicateState?.nickname;

      if (
        nextValue !== currentValue &&
        (!nicknameState?.available || nicknameState.checkedValue !== nextValue)
      ) {
        setProfileGuardError('저장에 실패했습니다. 닉네임 중복 확인을 완료해 주세요.');
        setActiveEditor('nickname');
        return false;
      }
    }

    if (fieldKey === 'email') {
      const currentValue = String(profile.email || '').trim();
      const nextValue = String(profileForm.email || '').trim();

      if (nextValue !== currentValue && !emailAuth.verified) {
        setEmailAuth((current) => ({
          ...current,
          tone: 'error',
          message: '이메일 저장 전에 인증 확인을 완료해 주세요.',
        }));
        setProfileGuardError('저장에 실패했습니다. 이메일 인증을 완료해 주세요.');
        setActiveEditor('email');
        return false;
      }
    }

    if (fieldKey === 'phone') {
      const currentValue = String(profile.phone || '').trim();
      const nextValue = String(profileForm.phone || '').trim();

      if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(nextValue)) {
        setPhoneAuth((current) => ({
          ...current,
          tone: 'error',
          message: '올바른 연락처 형식으로 입력해 주세요. 예: 010-1234-5678',
        }));
        setProfileGuardError('저장에 실패했습니다. 연락처 형식을 확인해 주세요.');
        setActiveEditor('phone');
        return false;
      }

      if (nextValue !== currentValue && !phoneAuth.verified) {
        setPhoneAuth((current) => ({
          ...current,
          tone: 'error',
          message: '연락처 저장 전에 인증 확인을 완료해 주세요.',
        }));
        setProfileGuardError('저장에 실패했습니다. 연락처 인증을 완료해 주세요.');
        setActiveEditor('phone');
        return false;
      }
    }

    return true;
  }

  function handleRequestEmailCode() {
    const nextEmail = String(profileForm.email || '').trim();

    if (!nextEmail) {
      setEmailAuth({
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '이메일을 입력한 뒤 인증번호를 요청해 주세요.',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setEmailAuth({
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '올바른 이메일 형식으로 입력해 주세요.',
      });
      return;
    }

    setEmailAuth({
      requested: true,
      verified: false,
      code: '',
      remainingSeconds: 300,
      tone: 'info',
      message: '인증번호를 전송했습니다. 아래에서 인증번호를 입력하고 확인을 진행해 주세요.',
    });
  }

  function handleEmailCodeChange(event) {
    setEmailAuth((current) => ({
      ...current,
      verified: false,
      code: event.target.value,
      remainingSeconds: current.remainingSeconds,
      tone: '',
      message: '',
    }));
  }

  function handleConfirmEmailCode() {
    if (!emailAuth.requested) {
      setEmailAuth((current) => ({
        ...current,
        tone: 'error',
        message: '먼저 인증번호를 요청해 주세요.',
      }));
      return;
    }

    if (emailAuth.remainingSeconds <= 0) {
      setEmailAuth((current) => ({
        ...current,
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.',
      }));
      return;
    }

    if (!/^\d{6}$/.test(String(emailAuth.code || '').trim())) {
      setEmailAuth((current) => ({
        ...current,
        verified: false,
        tone: 'error',
        message: '인증번호 6자리를 입력해 주세요.',
      }));
      return;
    }

    setEmailAuth((current) => ({
      ...current,
      verified: true,
      remainingSeconds: current.remainingSeconds,
      tone: 'success',
      message: '이메일 인증이 완료되었습니다.',
    }));
  }

  function handleRequestPhoneCode() {
    const nextPhone = String(profileForm.phone || '').trim();

    if (!nextPhone) {
      setPhoneAuth({
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '연락처를 입력한 뒤 인증번호를 요청해 주세요.',
      });
      return;
    }

    if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(nextPhone)) {
      setPhoneAuth({
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '올바른 연락처 형식으로 입력해 주세요. 예: 010-1234-5678',
      });
      return;
    }

    setPhoneAuth({
      requested: true,
      verified: false,
      code: '',
      remainingSeconds: 300,
      tone: 'info',
      message: '인증번호를 전송했습니다. 아래에서 인증번호를 입력하고 확인을 진행해 주세요.',
    });
  }

  function handlePhoneCodeChange(event) {
    setPhoneAuth((current) => ({
      ...current,
      verified: false,
      code: event.target.value,
      remainingSeconds: current.remainingSeconds,
      tone: '',
      message: '',
    }));
  }

  function handleConfirmPhoneCode() {
    if (!phoneAuth.requested) {
      setPhoneAuth((current) => ({
        ...current,
        tone: 'error',
        message: '먼저 인증번호를 요청해 주세요.',
      }));
      return;
    }

    if (phoneAuth.remainingSeconds <= 0) {
      setPhoneAuth((current) => ({
        ...current,
        requested: false,
        verified: false,
        code: '',
        remainingSeconds: 0,
        tone: 'error',
        message: '인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.',
      }));
      return;
    }

    if (!/^\d{6}$/.test(String(phoneAuth.code || '').trim())) {
      setPhoneAuth((current) => ({
        ...current,
        verified: false,
        tone: 'error',
        message: '인증번호 6자리를 입력해 주세요.',
      }));
      return;
    }

    setPhoneAuth((current) => ({
      ...current,
      verified: true,
      remainingSeconds: current.remainingSeconds,
      tone: 'success',
      message: '연락처 인증이 완료되었습니다.',
    }));
  }

  async function handleProfileRowSubmit(fieldKey, event) {
    event?.preventDefault();

    if (!validateProfileFieldBeforeSave(fieldKey)) {
      return false;
    }

    const success = await onProfileSubmit(fieldKey, event);
    if (success) {
      resetEmailAuth();
      resetPhoneAuth();
      setProfileGuardError('');
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

  async function handleWithdrawRowSubmit(event) {
    event.preventDefault();
    const success = await onWithdrawSubmit(event);
    if (success) {
      setActiveEditor(null);
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <h1>개인정보 관리</h1>
          <p>계정 정보와 기본 배송지를 확인하고, 수정 가능한 항목은 이 페이지에서 바로 변경할 수 있습니다.</p>
        </div>
      </section>

      {profileError && <article className="card feedback-card feedback-card--error">{profileError}</article>}

      <section className="section">
        <article className="card profile-inline-card">
          <div className="profile-inline-card__head">
            <div className="profile-inline-card__identity">
              <div className="profile-inline-avatar" aria-hidden="true">
                {profile.profileImageUrl ? (
                  <img
                    src={profileImageSrc}
                    alt=""
                    className="profile-inline-avatar__image"
                    onError={handleProfileImageLoadError}
                  />
                ) : (
                  <span className="profile-inline-avatar__fallback">{profileInitial || '?'}</span>
                )}
              </div>
              <div className="profile-inline-card__intro">
                <div className="section-title">
                  {profileLoading ? '불러오는 중..' : (profile.nickname || profile.userId || '-')}
                </div>
                <div className="section-sub">
                  수정 가능한 항목은 각 행에서 바로 편집하고, 계정 정보는 같은 목록 안에서 한 번에 확인할 수 있습니다.
                </div>
              </div>
            </div>
            <div className="profile-inline-card__photo-actions">
              <label className={`btn-outline profile-image-upload-btn ${profileImageUploading ? 'is-uploading' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="profile-image-upload-btn__input"
                  onChange={handleProfileImageChange}
                  disabled={profileImageUploading}
                />
                {profileImageUploading ? '사진 업로드 중..' : '사진 변경'}
              </label>
              {profileImageError && <div className="form-error">{profileImageError}</div>}
            </div>
          </div>
          <div className="section-head">
            <div>
              <div className="section-title">
                {profileLoading ? '불러오는 중..' : (profile.nickname || profile.userId || '-')}
              </div>
              <div className="section-sub">
                수정 가능한 항목은 각 행에서 바로 편집하고, 읽기 전용 정보는 같은 목록 안에서 한 번에 확인할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="profile-inline-list">
            {infoRows.map((item) => {
              const isEditing = activeEditor === item.key;
              const isProfileField = item.key === 'nickname' || item.key === 'email' || item.key === 'phone';
              const duplicateInfo = duplicateState?.[item.key];
              const showDuplicateCheck = item.key === 'nickname' || item.key === 'email';
              const isEmailField = item.key === 'email';
              const isPhoneField = item.key === 'phone';
              const currentFieldValue = String(profile[item.key] || '').trim();
              const nextFieldValue = String(profileForm[item.key] || '').trim();
              const isChanged = nextFieldValue !== currentFieldValue;
              const canSaveField = item.key === 'nickname'
                ? (!isChanged || Boolean(duplicateInfo?.available && duplicateInfo.checkedValue === nextFieldValue))
                : item.key === 'email'
                  ? (!isChanged || emailAuth.verified)
                  : item.key === 'phone'
                    ? (!isChanged || phoneAuth.verified)
                  : true;
              const saveBlockedMessage = item.key === 'nickname'
                ? '닉네임 중복 확인을 완료하면 저장할 수 있습니다.'
                : item.key === 'email'
                  ? '이메일 인증을 완료하면 저장할 수 있습니다.'
                  : item.key === 'phone'
                    ? '연락처 인증을 완료하면 저장할 수 있습니다.'
                  : '';
              const saveButtonDisabled = profileSubmitting || !isChanged || !canSaveField;

              if (isProfileField) {
                return (
                  <div key={item.key} className={`profile-inline-row ${isEditing ? 'is-editing' : ''}`}>
                    <div className="profile-inline-row__label">{item.label}</div>

                    {isEditing ? (
                      <form className="profile-inline-editor" onSubmit={(event) => handleProfileRowSubmit(item.key, event)}>
                        <div className="profile-inline-editor__top">
                          <div className="profile-inline-editor__field">
                            <input
                              name={item.key}
                              value={profileForm[item.key]}
                              onChange={handleInlineProfileChange}
                              placeholder={`${item.label}을 입력해 주세요.`}
                            />
                          </div>

                          {showDuplicateCheck && (
                            <button
                              type="button"
                              className="btn-outline profile-inline-editor__check"
                              disabled={duplicateInfo?.checking}
                              onClick={() => onDuplicateCheck(item.key)}
                            >
                              {duplicateInfo?.checking ? '확인 중..' : '중복 확인'}
                            </button>
                          )}
                        </div>

                        {showDuplicateCheck && duplicateInfo?.message && (
                          <div className={`form-error ${duplicateInfo.available ? 'form-error--success' : ''}`}>
                            {duplicateInfo.message}
                          </div>
                        )}

                        {isEmailField && (
                          <div className="profile-inline-verify">
                            <div className="profile-inline-verify__head">
                              <div className="profile-inline-verify__title">이메일 인증</div>
                              <button type="button" className="btn-outline" onClick={handleRequestEmailCode}>
                                {emailAuth.requested ? '인증번호 재전송' : '인증번호 받기'}
                              </button>
                            </div>

                            <div className="profile-inline-verify__sub">
                              변경한 이메일로 인증번호를 받아 입력한 뒤 인증 확인을 진행해 주세요.
                            </div>

                            {emailAuth.requested && (
                              <div className="profile-inline-verify__code">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  value={emailAuth.code}
                                  onChange={handleEmailCodeChange}
                                  placeholder="인증번호 6자리"
                                />
                                {!emailAuth.verified && (
                                  <div className="profile-inline-verify__timer">
                                    {formatCountdown(emailAuth.remainingSeconds)}
                                  </div>
                                )}
                                <button type="button" className="btn" onClick={handleConfirmEmailCode}>
                                  인증 확인
                                </button>
                              </div>
                            )}

                            {emailAuth.message && (
                              <div
                                className={`form-error ${
                                  emailAuth.tone === 'success' ? 'form-error--success' : ''
                                }`}
                              >
                                {emailAuth.message}
                              </div>
                            )}
                          </div>
                        )}

                        {isPhoneField && (
                          <div className="profile-inline-verify">
                            <div className="profile-inline-verify__head">
                              <div className="profile-inline-verify__title">연락처 인증</div>
                              <button type="button" className="btn-outline" onClick={handleRequestPhoneCode}>
                                {phoneAuth.requested ? '인증번호 재전송' : '인증번호 받기'}
                              </button>
                            </div>

                            <div className="profile-inline-verify__sub">
                              변경한 연락처로 인증번호를 받아 입력한 뒤 인증 확인을 진행해 주세요.
                            </div>

                            {phoneAuth.requested && (
                              <div className="profile-inline-verify__code">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  value={phoneAuth.code}
                                  onChange={handlePhoneCodeChange}
                                  placeholder="인증번호 6자리"
                                />
                                {!phoneAuth.verified && (
                                  <div className="profile-inline-verify__timer">
                                    {formatCountdown(phoneAuth.remainingSeconds)}
                                  </div>
                                )}
                                <button type="button" className="btn" onClick={handleConfirmPhoneCode}>
                                  인증 확인
                                </button>
                              </div>
                            )}

                            {phoneAuth.message && (
                              <div
                                className={`form-error ${
                                  phoneAuth.tone === 'success' ? 'form-error--success' : ''
                                }`}
                              >
                                {phoneAuth.message}
                              </div>
                            )}
                          </div>
                        )}

                        {!isChanged && !profileGuardError && !profileSubmitError && (
                          <div className="form-error form-error--soft">변경 후 저장할 수 있습니다.</div>
                        )}

                        {!canSaveField && isChanged && saveBlockedMessage && !profileGuardError && !profileSubmitError && (
                          <div className="form-error form-error--soft">{saveBlockedMessage}</div>
                        )}

                        {(profileGuardError || profileSubmitError) && (
                          <div className="form-error">{profileGuardError || profileSubmitError}</div>
                        )}

                        <div className="profile-inline-row__actions">
                          <button type="button" className="btn-outline" onClick={handleCancelProfileEdit}>
                            취소
                          </button>
                          <button
                            type="button"
                            className="btn"
                            disabled={saveButtonDisabled}
                            onClick={(event) => handleProfileRowSubmit(item.key, event)}
                          >
                            {profileSubmitting ? '저장 중..' : '저장'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="profile-inline-row__value">
                          {profileLoading ? '불러오는 중..' : item.value}
                        </div>
                        <div className="profile-inline-row__actions">
                          <button type="button" className="btn-outline" onClick={() => handleStartEdit(item.key)}>
                            수정
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.key}
                  className={`profile-inline-row ${item.key === 'totalSavedAmount' ? 'profile-inline-row--saving' : ''}`}
                >
                  <div className="profile-inline-row__label">{item.label}</div>
                  <div className="profile-inline-row__value">
                    {profileLoading ? '불러오는 중..' : item.value}
                  </div>
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
                    <button type="button" className="btn-outline" onClick={handleCancelPasswordEdit}>
                      취소
                    </button>
                    <button type="submit" className="btn" disabled={passwordSubmitting}>
                      {passwordSubmitting ? '변경 중..' : '변경'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="profile-inline-row__value">********</div>
                  <div className="profile-inline-row__actions">
                    <button type="button" className="btn-outline" onClick={() => setActiveEditor('password')}>
                      변경
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </article>

        <article className="card withdraw-card">
          <div className="section-head">
            <div>
              <div className="section-title">회원 탈퇴</div>
              <div className="section-sub">탈퇴 이후에는 현재 계정 정보로 마이페이지 기능을 계속 사용할 수 없습니다.</div>
            </div>
          </div>

          <form className="withdraw-form" onSubmit={handleWithdrawRowSubmit}>
            <label className="form-field form-field--full">
              <span>현재 비밀번호</span>
              <input
                type="password"
                name="currentPassword"
                value={withdrawForm.currentPassword}
                onChange={onWithdrawFormChange}
                placeholder="회원 탈퇴를 위해 현재 비밀번호를 입력해 주세요."
              />
            </label>

            {withdrawError && <div className="form-error">{withdrawError}</div>}

            <div className="withdraw-actions">
              <button type="submit" className="btn withdraw-submit-btn" disabled={withdrawing}>
                {withdrawing ? '탈퇴 처리 중..' : '회원 탈퇴'}
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}

export default MyPageView;
