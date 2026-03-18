function ProfileEditModal({
  open,
  form,
  onChange,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <div className="section-title">회원정보 수정</div>
            <div className="section-sub">닉네임, 이메일, 연락처를 수정할 수 있습니다.</div>
          </div>
          <button type="button" className="btn-outline" onClick={onClose}>닫기</button>
        </div>

        <form className="profile-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>닉네임</span>
              <input name="nickname" value={form.nickname} onChange={onChange} placeholder="닉네임을 입력하세요" />
            </label>
            <label className="form-field">
              <span>이메일</span>
              <input name="email" value={form.email} onChange={onChange} placeholder="이메일을 입력하세요" />
            </label>
            <label className="form-field form-field--full">
              <span>연락처</span>
              <input name="phone" value={form.phone} onChange={onChange} placeholder="연락처를 입력하세요" />
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>취소</button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileEditModal;
