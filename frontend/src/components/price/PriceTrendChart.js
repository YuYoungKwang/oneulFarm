import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RANGE_OPTIONS = [
  { key: '7D', label: '7일', days: 7 },
  { key: '1M', label: '1개월', days: 30 },
  { key: '3M', label: '3개월', days: 90 },
  { key: '1Y', label: '1년', days: 365 },
];

export default function PriceTrendChart({
  points = [],
  productLabel,
  subtitle,
  title,
}) {
  const [rangeKey, setRangeKey] = useState('1M');

  const chartModel = useMemo(() => {
    if (!points.length) {
      return null;
    }

    const activeRange =
      RANGE_OPTIONS.find((option) => option.key === rangeKey) || RANGE_OPTIONS[1];
    const rangePoints = filterPointsByRange(points, activeRange.days);
    const safePoints = rangePoints.length ? rangePoints : points;
    const currentPoint = safePoints[safePoints.length - 1];
    const currentPrice = Number(currentPoint?.value || 0);
    const previousWeekIndex = Math.max(safePoints.length - 8, 0);
    const previousWeekPrice = Number(
      safePoints[previousWeekIndex]?.value || safePoints[0]?.value || currentPrice
    );
    const weekChangeRate = calculateRate(currentPrice, previousWeekPrice);
    const values = safePoints.map((point) => Number(point.value || 0));
    const highestPrice = Math.max(...values);
    const lowestPrice = Math.min(...values);
    const averagePrice =
      values.reduce((accumulator, value) => accumulator + value, 0) /
      Math.max(values.length, 1);
    const currentVsAverage = calculateRate(currentPrice, averagePrice);

    return {
      activeRange,
      averagePrice,
      currentPrice,
      currentVsAverage,
      highestPrice,
      lowestPrice,
      points: safePoints.map((point) => ({
        date: point.date,
        label: point.label,
        shortDate: formatXAxisLabel(point.date, activeRange.key),
        value: Number(point.value || 0),
      })),
      rangeLabel: getRangeLabel(activeRange.key),
      weekChangeRate,
    };
  }, [points, rangeKey]);

  if (!chartModel) {
    return (
      <div className="price-trend-chart price-trend-chart--empty">
        <div className="price-trend-chart__header">
          <div className="price-trend-chart__header-copy">
            <span className="price-trend-chart__eyebrow">PRICE CHART</span>
            <strong>{title || '가격 추이 차트'}</strong>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        <div className="price-empty-inline">차트로 표시할 가격 데이터가 없습니다.</div>
      </div>
    );
  }

  const toneClass = getDeltaToneClass(chartModel.weekChangeRate);

  return (
    <section className="price-trend-chart price-trend-chart--recharts">
      <header className="price-trend-chart__header">
        <div className="price-trend-chart__header-copy">
          <span className="price-trend-chart__eyebrow">PRICE CHART</span>
          <strong>{title || '가격 추이 차트'}</strong>
          <p>
            {productLabel ? `${productLabel} · ` : ''}
            {subtitle || `${chartModel.rangeLabel} 동안 가격 흐름을 확인할 수 있습니다.`}
          </p>
        </div>

        <div className="price-trend-chart__range" role="tablist" aria-label="조회 기간">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              aria-pressed={rangeKey === option.key}
              className={`price-trend-chart__range-btn ${
                rangeKey === option.key ? 'is-active' : ''
              }`}
              type="button"
              onClick={() => setRangeKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="price-trend-chart__hero">
        <div className="price-trend-chart__hero-primary">
          <span className="price-trend-chart__hero-label">현재 평균가</span>
          <strong>{formatCurrency(chartModel.currentPrice)}</strong>
          <div className={`price-trend-chart__delta ${toneClass}`}>
            <span className="price-trend-chart__delta-badge">{chartModel.rangeLabel}</span>
            <span>{formatPercent(chartModel.weekChangeRate)} 전주 대비</span>
          </div>
        </div>

        <dl className="price-trend-chart__hero-stats">
          <div>
            <dt>기간 평균가</dt>
            <dd>{formatCurrency(chartModel.averagePrice)}</dd>
          </div>
          <div>
            <dt>최고가</dt>
            <dd>{formatCurrency(chartModel.highestPrice)}</dd>
          </div>
          <div>
            <dt>최저가</dt>
            <dd>{formatCurrency(chartModel.lowestPrice)}</dd>
          </div>
          <div>
            <dt>평균 대비</dt>
            <dd>{formatPercent(chartModel.currentVsAverage)}</dd>
          </div>
        </dl>
      </div>

      <div className="price-trend-chart__canvas">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartModel.points}
            margin={{ top: 18, right: 12, left: 0, bottom: 8 }}
          >
            <defs>
              <linearGradient id="priceTrendAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#12a150" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#12a150" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <CartesianGrid
              horizontal
              vertical={false}
              stroke="rgba(148, 163, 184, 0.12)"
              strokeDasharray="3 8"
            />
            <XAxis
              axisLine={false}
              dataKey="shortDate"
              dy={10}
              minTickGap={24}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={['dataMin - 150', 'dataMax + 150']}
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 800 }}
              tickCount={4}
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              width={56}
            />
            <ReferenceLine
              ifOverflow="extendDomain"
              stroke="rgba(15, 23, 42, 0.18)"
              strokeDasharray="4 6"
              strokeWidth={1}
              y={chartModel.averagePrice}
            />
            <Tooltip
              content={<PriceChartTooltip />}
              cursor={{ stroke: 'rgba(15, 23, 42, 0.16)', strokeDasharray: '4 4' }}
            />
            <Area
              activeDot={{ fill: '#12a150', r: 4, stroke: '#ffffff', strokeWidth: 3 }}
              animationDuration={260}
              dataKey="value"
              dot={false}
              fill="url(#priceTrendAreaFill)"
              isAnimationActive
              stroke="#0f9a54"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function PriceChartTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const currentValue = Number(payload[0]?.value || 0);

  return (
    <div className="price-trend-chart__tooltip">
      <span className="price-trend-chart__tooltip-date">{label}</span>
      <strong className="price-trend-chart__tooltip-value">
        {formatCurrency(currentValue)}
      </strong>
      <span className="price-trend-chart__tooltip-note">해당 시점 평균가</span>
    </div>
  );
}

function filterPointsByRange(points, days) {
  if (!points.length) {
    return [];
  }

  const latestDate = new Date(points[points.length - 1].date);
  const threshold = new Date(latestDate);
  threshold.setDate(threshold.getDate() - (days - 1));

  const filtered = points.filter((point) => new Date(point.date) >= threshold);
  return filtered.length ? filtered : points.slice(-days);
}

function getRangeLabel(rangeKey) {
  switch (rangeKey) {
    case '7D':
      return '최근 7일';
    case '3M':
      return '최근 3개월';
    case '1Y':
      return '최근 1년';
    case '1M':
    default:
      return '최근 1개월';
  }
}

function getDeltaToneClass(value) {
  if (value < 0) {
    return 'is-positive';
  }
  if (value > 0) {
    return 'is-negative';
  }
  return 'is-neutral';
}

function calculateRate(currentValue, previousValue) {
  const currentNumber = Number(currentValue || 0);
  const previousNumber = Number(previousValue || 0);
  if (!previousNumber) {
    return 0;
  }

  return ((currentNumber - previousNumber) / previousNumber) * 100;
}

function formatCompactCurrency(value) {
  const numericValue = Number(value || 0);
  if (Math.abs(numericValue) >= 1000) {
    return `${(numericValue / 1000).toFixed(1)}k`;
  }
  return `${Math.round(numericValue)}`;
}

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function formatXAxisLabel(value, rangeKey) {
  const date = new Date(value);

  if (rangeKey === '1Y') {
    return `${date.getMonth() + 1}월`;
  }

  if (rangeKey === '3M') {
    return `${date.getMonth() + 1}.${date.getDate()}`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
