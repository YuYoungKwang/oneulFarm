function InlineInfoTip({ content, label = '설명 보기' }) {
  if (!content) {
    return null;
  }

  return (
    <span className="account-info-tip" tabIndex={0} aria-label={label}>
      <span className="account-info-tip__trigger" aria-hidden="true">i</span>
      <span className="account-info-tip__content" role="tooltip">{content}</span>
    </span>
  );
}

export default InlineInfoTip;
