/** Lightweight dependency-free radar chart (3+ axes) used by the scan overview. */

export interface RadarAxis {
  label: string;
  /** 0-100 */
  value: number;
  tone?: 'danger' | 'warning' | 'positive';
}

const TONES = {
  danger: '#ef4444',
  warning: '#f59e0b',
  positive: '#22c55e',
  accent: '#3b82f6',
} as const;

export function RadarChart({
  axes,
  size = 260,
  tone = 'accent',
  showValues = true,
}: {
  axes: RadarAxis[];
  size?: number;
  tone?: keyof typeof TONES;
  showValues?: boolean;
}) {
  const count = Math.max(3, axes.length);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 44;
  const color = TONES[tone];

  const angleFor = (index: number) => (-90 + (360 / count) * index) * (Math.PI / 180);

  const ringPath = (fraction: number) =>
    Array.from({ length: count }, (_, index) => {
      const angle = angleFor(index);
      return `${cx + Math.cos(angle) * radius * fraction},${cy + Math.sin(angle) * radius * fraction}`;
    }).join(' ');

  const points = axes.map((axis, index) => {
    const angle = angleFor(index);
    const r = radius * Math.max(0, Math.min(1, axis.value / 100));
    return {
      ...axis,
      angle,
      point: `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      labelX: cx + Math.cos(angle) * (radius + 24),
      labelY: cy + Math.sin(angle) * (radius + 24),
    };
  });

  return (
    <svg viewBox={`-8 -8 ${size + 16} ${size + 16}`} width="100%" height={size} role="img" aria-label="Scan overview radar">
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={ringPath(fraction)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
          strokeDasharray={fraction === 1 ? undefined : '3 4'}
        />
      ))}

      {/* spokes */}
      {axes.map((_, index) => {
        const angle = angleFor(index);
        return (
          <line
            key={index}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * radius}
            y2={cy + Math.sin(angle) * radius}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        );
      })}

      {/* value polygon */}
      <polygon points={points.map((entry) => entry.point).join(' ')} fill={`${color}2e`} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />

      {/* vertices */}
      {points.map((entry) => (
        <circle key={entry.label} cx={entry.x} cy={entry.y} r={3} fill={color} stroke="#0a0b0d" strokeWidth={1.5} />
      ))}

      {/* labels */}
      {points.map((entry) => {
        const dy = entry.labelY < cy - 4 ? -3 : entry.labelY > cy + 4 ? 9 : 4;
        return (
          <text
            key={`label-${entry.label}`}
            x={entry.labelX}
            y={entry.labelY + dy}
            textAnchor="middle"
            fontSize={11.5}
            fill="#9aa0a6"
            style={{ letterSpacing: '0.02em' }}
          >
            {entry.label}
            {showValues && <tspan fill="#5a6068"> {Math.round(entry.value)}</tspan>}
          </text>
        );
      })}
    </svg>
  );
}

export default RadarChart;
