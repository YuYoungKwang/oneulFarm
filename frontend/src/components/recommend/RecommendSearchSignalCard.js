export default function RecommendSearchSignalCard({ item }) {
  const latestRatio = Math.round(Number(item?.latestRatio || 0));
  const changeRatio = Number(item?.changeRatio || 0);
  const changeLabel =
    changeRatio > 0 ? `+${Math.round(changeRatio)}p` : `${Math.round(changeRatio)}p`;

  return (
    <article className="recommend-signal-card">
      <div className="recommend-signal-card__head">
        <span className={`recommend-signal-card__trend is-${resolveTrendTone(item?.trendDirection)}`}>
          {resolveTrendLabel(item?.trendDirection)}
        </span>
        <small>{item?.latestPeriod || "최근 집계"}</small>
      </div>
      <strong>{item?.keyword || "인기 품목"}</strong>
      <div className="recommend-signal-card__value-row">
        <span className="recommend-signal-card__value">{latestRatio}</span>
        <span className="recommend-signal-card__change">{changeLabel}</span>
      </div>
      <p>최고 관심도 {Math.round(Number(item?.peakRatio || 0))} 기준</p>
    </article>
  );
}

function resolveTrendLabel(direction) {
  if (direction === "UP") {
    return "상승";
  }

  if (direction === "DOWN") {
    return "하락";
  }

  return "유지";
}

function resolveTrendTone(direction) {
  if (direction === "UP") {
    return "up";
  }

  if (direction === "DOWN") {
    return "down";
  }

  return "flat";
}
