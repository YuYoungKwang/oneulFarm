function AddressModal({
  open,
  addresses,
  loading,
  error,
  changingAddressNo,
  isFormOpen,
  form,
  formError,
  submitting,
  onClose,
  onChangeDefault,
  onToggleForm,
  onFormChange,
  onFormSubmit,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card--wide modal-card--address"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-head modal-head modal-head--sticky">
          <div>
            <div className="section-title">배송지 관리</div>
            <div className="section-sub">
              배송지 목록을 확인하고 기본 배송지를 변경하거나 새 배송지를 등록할 수 있습니다.
            </div>
          </div>
          <div className="page-actions">
            {isFormOpen ? (
              <button type="button" className="btn-outline" onClick={onToggleForm}>
                목록으로 돌아가기
              </button>
            ) : (
              <button type="button" className="btn-outline" onClick={onToggleForm}>
                배송지 추가
              </button>
            )}
            <button type="button" className="btn-outline" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>

        {isFormOpen ? (
          <form className="card profile-form address-form-panel" onSubmit={onFormSubmit}>
            <div className="card-title">새 배송지 등록</div>
            <div className="form-grid">
              <label className="form-field">
                <span>배송지 이름</span>
                <input
                  name="addressName"
                  value={form.addressName}
                  onChange={onFormChange}
                  placeholder="집 또는 회사"
                />
              </label>
              <label className="form-field">
                <span>수령인</span>
                <input
                  name="recipientName"
                  value={form.recipientName}
                  onChange={onFormChange}
                  placeholder="수령인 이름"
                />
              </label>
              <label className="form-field">
                <span>연락처</span>
                <input
                  name="recipientPhone"
                  value={form.recipientPhone}
                  onChange={onFormChange}
                  placeholder="010-0000-0000"
                />
              </label>
              <label className="form-field">
                <span>우편번호</span>
                <input
                  name="zipCode"
                  value={form.zipCode}
                  onChange={onFormChange}
                  placeholder="12345"
                />
              </label>
              <label className="form-field form-field--full">
                <span>기본 주소</span>
                <input
                  name="address1"
                  value={form.address1}
                  onChange={onFormChange}
                  placeholder="기본 주소"
                />
              </label>
              <label className="form-field form-field--full">
                <span>상세 주소</span>
                <input
                  name="address2"
                  value={form.address2}
                  onChange={onFormChange}
                  placeholder="상세 주소"
                />
              </label>
              <label className="form-field form-field--full">
                <span>배송메시지</span>
                <input
                  name="deliveryMessage"
                  value={form.deliveryMessage}
                  onChange={onFormChange}
                  placeholder="문 앞에 놓아주세요"
                />
              </label>
            </div>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault === 'Y'}
                onChange={onFormChange}
              />
              <span>기본 배송지로 설정</span>
            </label>

            {formError && <div className="form-error">{formError}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={onToggleForm}>
                취소
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? '등록 중..' : '배송지 등록'}
              </button>
            </div>
          </form>
        ) : (
          <div className="address-list-shell">
            {loading && <article className="card feedback-card">배송지 목록을 불러오는 중입니다.</article>}
            {!loading && error && <article className="card feedback-card feedback-card--error">{error}</article>}

            {!loading && !error && addresses.length === 0 && (
              <article className="card feedback-card">등록된 배송지가 없습니다.</article>
            )}

            {!loading && !error && addresses.length > 0 && (
              <div className="address-list">
                {addresses.map((address) => (
                  <article key={address.addressNo} className="address-card">
                    <div className="address-card__top">
                      <div>
                        <div className="card-title">{address.addressName || '배송지'}</div>
                        <div className="section-sub">
                          {address.recipientName} / {address.recipientPhone}
                        </div>
                      </div>
                      {address.isDefault === 'Y' ? (
                        <span className="badge green">기본 배송지</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-outline"
                          disabled={changingAddressNo === address.addressNo}
                          onClick={() => onChangeDefault(address.addressNo)}
                        >
                          {changingAddressNo === address.addressNo ? '변경 중..' : '기본으로 설정'}
                        </button>
                      )}
                    </div>

                    <div className="address-card__body">
                      <div>{address.zipCode}</div>
                      <div>{address.address1}</div>
                      {address.address2 && <div>{address.address2}</div>}
                      {address.deliveryMessage && (
                        <div className="section-sub">배송메시지: {address.deliveryMessage}</div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddressModal;
