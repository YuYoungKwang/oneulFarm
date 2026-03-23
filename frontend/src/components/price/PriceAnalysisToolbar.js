import { SearchIcon } from '../ProductIcons';

export default function PriceAnalysisToolbar({
  onPrimaryAction,
  onQueryChange,
  onSelectSuggestion,
  primaryActionLabel,
  query,
  selectedItemLabel,
  selectedMeta,
  suggestions = [],
}) {
  return (
    <section className="price-toolbar">
      <div className="price-toolbar__row">
        <label className="price-toolbar__search">
          <SearchIcon />
          <input
            aria-label="농산물 이름 검색"
            placeholder="판매 중인 농산물 이름으로 가격을 검색해보세요"
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
            </button>
          ))}
        </div>
      ) : (
        <div className="price-toolbar__help">
          검색 결과가 없습니다. 다른 상품명으로 다시 검색해보세요.
        </div>
      )}
    </section>
  );
}
