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

export default function PriceTrendChart({ points = [], title }) {
  const [rangeKey, setRangeKey] = useState('1M');

  const chartModel = useMemo(() => {
    if (!points.length) {
      return null;
    }

    const activeRange =
      RANGE_OPTIONS.find((option) => option.key === rangeKey) || RANGE_OPTIONS[1];
    const filteredPoints = filterPointsByRange(points, activeRange.days);
    const safePoints = filteredPoints.length ? filteredPoints : points;
    const values = safePoints.map((point) => Number(point.value || 0));
    const averagePrice =
      values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const highestPrice = values.length ? Math.max(...values) : 0;
    const lowestPrice = values.length ? Math.min(...values) : 0;
    const latestPrice = values.length ? values[values.length - 1] : 0;
    const minDomain = lowestPrice * 0.96;
    const maxDomain = highestPrice * 1.04;

    return {
      averagePrice,
      highestPrice,
      latestPrice,
      lowestPrice,
      points: safePoints.map((point) => ({
        date: point.date,
        label: point.label,
        shortDate: formatXAxisLabel(point.date, activeRange.key),
        value: Number(point.value || 0),
      })),
      rangeLabel: getRangeLabel(activeRange.key),
      yAxisDomain: [Math.floor(minDomain), Math.ceil(maxDomain)],
    };
  }, [points, rangeKey]);

  if (!chartModel) {
    return <div className="price-empty-inline">차트로 보여줄 가격 데이터가 없습니다.</div>;
  }

  return (
    <section className="price-trend-chart">
      <div className="price-trend-chart__header">
        <div className="price-trend-chart__copy">
          <strong>{title || '가격 추세 차트'}</strong>
          <p>{chartModel.rangeLabel} 시세 흐름입니다.</p>
        </div>

        <div className="price-trend-chart__range" role="tablist" aria-label="시세 조회 기간">
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
      </div>

      <div className="price-trend-chart__canvas">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartModel.points}
            margin={{ top: 14, right: 10, left: 0, bottom: 6 }}
          >
            <defs>
              <linearGradient id="priceTrendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#17924d" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#17924d" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <CartesianGrid
              horizontal
              vertical={false}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeDasharray="3 7"
            />
            <XAxis
              axisLine={false}
              dataKey="shortDate"
              dy={10}
              minTickGap={18}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={chartModel.yAxisDomain}
              tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
              tickCount={4}
              tickFormatter={formatCompactAxisValue}
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
              content={<PriceTrendTooltip />}
              cursor={{ stroke: 'rgba(15, 23, 42, 0.16)', strokeDasharray: '4 4' }}
            />
            <Area
              activeDot={{ fill: '#17924d', r: 4, stroke: '#ffffff', strokeWidth: 3 }}
              animationDuration={260}
              dataKey="value"
              dot={false}
              fill="url(#priceTrendFill)"
              stroke="#17924d"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="price-trend-chart__stats">
        <div>
          <span>기간 평균</span>
          <strong>{formatCurrency(chartModel.averagePrice)}</strong>
        </div>
        <div>
          <span>최고가</span>
          <strong>{formatCurrency(chartModel.highestPrice)}</strong>
        </div>
        <div>
          <span>최저가</span>
          <strong>{formatCurrency(chartModel.lowestPrice)}</strong>
        </div>
        <div>
          <span>최근 가격</span>
          <strong>{formatCurrency(chartModel.latestPrice)}</strong>
        </div>
      </div>
    </section>
  );
}

function PriceTrendTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="price-trend-chart__tooltip">
      <span className="price-trend-chart__tooltip-date">{label}</span>
      <strong className="price-trend-chart__tooltip-value">
        {formatCurrency(payload[0]?.value)}
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

function formatXAxisLabel(value, rangeKey) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  if (rangeKey === '1Y') {
    return `${date.getMonth() + 1}월`;
  }

  if (rangeKey === '3M') {
    return `${date.getMonth() + 1}.${date.getDate()}`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatCompactAxisValue(value) {
  const numericValue = Number(value || 0);
  if (Math.abs(numericValue) >= 1000) {
    return `${(numericValue / 1000).toFixed(1)}k`;
  }
  return `${Math.round(numericValue)}`;
}

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}
