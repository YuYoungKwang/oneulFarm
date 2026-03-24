import { SearchIcon } from '../ProductIcons';

export default function PriceAnalysisToolbar({
  onPrimaryAction,
  onQueryChange,
  onSelectSuggestion,
  primaryActionLabel,
  query,
  selectedItemLabel,
  selectedMeta,
  selectedStats = [],
  suggestions = [],
}) {
  return (
    <section className="price-selector">
      <div className="price-selector__lead">
        <div className="price-selector__search-panel">
          <div className="price-selector__section-copy">
            <span className="price-chip-label">상품 선택</span>
            <h2>오늘 뭘 먼저 봐야 하는지 빠르게 골라요</h2>
            <p>
              가격 메리트와 변동 폭이 함께 보이도록 정리해, 전체 상품을 다 눌러보지
              않아도 우선순위를 쉽게 잡을 수 있습니다.
            </p>
          </div>

          <label className="price-selector__search-field">
            <SearchIcon />
            <input
              aria-label="가격 분석 상품 검색"
              placeholder="판매 중인 상품 이름으로 검색"
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div className="price-selector__selected-panel">
          <span className="price-chip-label">현재 분석 상품</span>
          <strong>{selectedItemLabel || '선택된 상품이 없습니다.'}</strong>
          {selectedMeta ? <p>{selectedMeta}</p> : null}

          {selectedStats.length ? (
            <div className="price-selector__selected-stats">
              {selectedStats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <button className="price-btn price-btn--secondary" type="button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        </div>
      </div>

      <div className="price-selector__quick-panel">
        <div className="price-selector__section-copy">
          <span className="price-chip-label">빠른 랭킹</span>
          <h3>할인율이 큰 상품부터 바로 비교해보세요</h3>
        </div>

        {suggestions.length ? (
          <div className="price-selector__grid">
            {suggestions.map((item) => (
              <button
                key={item.optionKey}
                className={`price-candidate-card ${item.isSelected ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelectSuggestion(item)}
              >
                <div className="price-candidate-card__top">
                  <span className="price-candidate-card__rank">
                    {String(item.rank).padStart(2, '0')}
                  </span>
                  <span className={`price-tone-pill tone-${item.tone}`}>{item.toneLabel}</span>
                </div>

                <div className="price-candidate-card__title">
                  <strong>{item.displayName}</strong>
                  <span>
                    {item.origin || '산지 정보 없음'} · {item.unitLabel}
                  </span>
                </div>

                <div className="price-candidate-card__price">
                  <strong>{item.currentPriceLabel}</strong>
                  <span>판매가 {item.salePriceLabel}</span>
                </div>

                <div className="price-candidate-card__stats">
                  <span>변동 {item.changeRateLabel}</span>
                  <span>할인 {item.savingRateLabel}</span>
                </div>

                <div className="price-candidate-card__bottom">
                  <span>{item.reasonLabel}</span>
                  <span>{item.isSelected ? '현재 보고 있음' : '차트 보기'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="price-selector__empty">검색 결과가 없습니다. 다른 이름으로 다시 찾아보세요.</div>
        )}
      </div>
    </section>
  );
}
