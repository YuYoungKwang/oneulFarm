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
    <section className="price-toolbar">
      <div className="price-toolbar__row">
        <label className="price-toolbar__search">
          <SearchIcon />
          <input
            aria-label="농산물 이름 검색"
            placeholder="판매 중인 농산물 이름으로 가격 흐름을 검색해보세요."
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && suggestions[0]) {
                onSelectSuggestion(suggestions[0]);
              }
            }}
          />
        </label>
      </div>

      <div className="price-toolbar__summary">
        <div className="price-toolbar__selected">
          <span className="price-toolbar__label">현재 분석 상품</span>
          <strong>{selectedItemLabel || '선택된 상품이 없습니다.'}</strong>
          {selectedMeta ? <p>{selectedMeta}</p> : null}
          {selectedStats.length ? (
            <div className="price-toolbar__selected-stats">
              {selectedStats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {primaryActionLabel ? (
          <button
            className="price-btn price-btn--primary"
            type="button"
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </button>
        ) : null}
      </div>

      {suggestions.length ? (
        <>
          <div className="price-toolbar__suggestions-head">
            <strong>분석 상품 선택</strong>
            <span>카드를 누르면 아래 차트가 바로 바뀝니다.</span>
          </div>
          <div className="price-toolbar__suggestions">
            {suggestions.map((item) => (
              <button
                key={item.optionKey}
                className={`price-suggestion ${item.isSelected ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelectSuggestion(item)}
              >
                <span className="price-suggestion__name">{item.label}</span>
                <span className="price-suggestion__meta">
                  {item.productName} · {item.marketLabel} · {item.unitLabel}
                </span>
                <div className="price-suggestion__stats">
                  <span>{item.currentPriceLabel}</span>
                  <span>{item.changeRateLabel}</span>
                  <span>{item.valueLabel}</span>
                </div>
                <span className="price-suggestion__action">
                  {item.isSelected ? '현재 차트' : '차트 보기'}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="price-toolbar__help">
          검색 결과가 없습니다. 다른 상품명으로 다시 검색해보세요.
        </div>
      )}
    </section>
  );
}
