import * as React from "react";

// --- SVG PIE / DONUT CHART ---
export interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  valueFormatter?: (v: number) => string;
}

export const SvgPieChart: React.FC<PieChartProps> = ({ data, colors, valueFormatter = (v) => `${v}` }) => {
  const total = React.useMemo(() => data.reduce((acc, d) => acc + (d.value || 0), 0), [data]);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!total || total <= 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>;
  }

  // Calculate slice angles
  let accumulatedAngle = 0;
  const slices = data.map((d, i) => {
    const fraction = d.value / total;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + fraction * 360;
    accumulatedAngle = endAngle;

    // Convert angles to SVG arc path
    const r = 40;
    const cx = 50;
    const cy = 50;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = fraction > 0.5 ? 1 : 0;

    // Inner radius for donut hole
    const rInner = 20;
    const x1Inner = cx + rInner * Math.cos(endRad);
    const y1Inner = cy + rInner * Math.sin(endRad);
    const x2Inner = cx + rInner * Math.cos(startRad);
    const y2Inner = cy + rInner * Math.sin(startRad);

    const pathData =
      fraction >= 0.9999
        ? `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z M ${cx},${cy - rInner} A ${rInner},${rInner} 0 1,0 ${cx - 0.01},${cy - rInner} Z`
        : `M ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} L ${x1Inner},${y1Inner} A ${rInner},${rInner} 0 ${largeArc},0 ${x2Inner},${y2Inner} Z`;

    return {
      ...d,
      color: colors[i % colors.length],
      pathData,
    };
  });

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full max-h-44 w-full">
        {slices.map((slice, i) => (
          <path
            key={slice.name}
            d={slice.pathData}
            fill={slice.color}
            className="transition-opacity duration-150 cursor-pointer"
            style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4 }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>
      {hoveredIndex !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-lg bg-popover/95 border border-border px-2.5 py-1 text-center shadow-md backdrop-blur">
            <div className="text-[10px] font-medium text-muted-foreground">{slices[hoveredIndex].name}</div>
            <div className="text-xs font-bold text-foreground">{valueFormatter(slices[hoveredIndex].value)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SVG RADAR CHART ---
export interface RadarChartProps {
  data: Array<{ axis: string; [key: string]: any }>;
  series: Array<{ name: string; key: string; stroke: string; fill: string }>;
}

export const SvgRadarChart: React.FC<RadarChartProps> = ({ data, series }) => {
  const [hoveredAxis, setHoveredAxis] = React.useState<number | null>(null);

  const numAxes = data.length;
  if (numAxes < 3) return null;

  const cx = 160;
  const cy = 150;
  const rMax = 95;

  const getCoordinates = (axisIndex: number, valueRatio: number) => {
    const angle = ((axisIndex * (360 / numAxes) - 90) * Math.PI) / 180;
    const r = rMax * valueRatio;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 320 300" className="h-full w-full">
        {/* Background Grid */}
        {gridLevels.map((level) => {
          const points = data
            .map((_, i) => {
              const { x, y } = getCoordinates(i, level);
              return `${x},${y}`;
            })
            .join(" ");
          return <polygon key={level} points={points} fill="none" stroke="currentColor" className="text-border" strokeDasharray="3 3" opacity={0.6} />;
        })}

        {/* Spoke lines & Axis labels */}
        {data.map((d, i) => {
          const { x, y } = getCoordinates(i, 1.0);
          const labelAngle = ((i * (360 / numAxes) - 90) * Math.PI) / 180;
          const labelR = rMax + 20;
          const lx = cx + labelR * Math.cos(labelAngle);
          const ly = cy + labelR * Math.sin(labelAngle);

          let anchor: "middle" | "end" | "start" = "middle";
          if (Math.abs(Math.cos(labelAngle)) > 0.3) {
            anchor = Math.cos(labelAngle) > 0 ? "start" : "end";
          }

          return (
            <g key={d.axis} onMouseEnter={() => setHoveredAxis(i)} onMouseLeave={() => setHoveredAxis(null)}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="text-border" opacity={0.5} />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="central"
                className="fill-muted-foreground text-[11px] font-medium select-none cursor-default"
              >
                {d.axis}
              </text>
            </g>
          );
        })}

        {/* Data Polygons */}
        {series.map((s) => {
          const points = data
            .map((d, i) => {
              const val = typeof d[s.key] === "number" ? d[s.key] : 0;
              const ratio = Math.max(0, Math.min(100, val)) / 100;
              const { x, y } = getCoordinates(i, ratio);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <g key={s.name}>
              <polygon points={points} fill={s.fill} fillOpacity={0.35} stroke={s.stroke} strokeWidth={2.5} />
              {data.map((d, i) => {
                const val = typeof d[s.key] === "number" ? d[s.key] : 0;
                const ratio = Math.max(0, Math.min(100, val)) / 100;
                const { x, y } = getCoordinates(i, ratio);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={hoveredAxis === i ? 5 : 3.5}
                    fill={s.stroke}
                    className="transition-all duration-150"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Tooltip on Hover */}
      {hoveredAxis !== null && (
        <div className="absolute top-2 right-2 rounded-xl bg-popover/95 border border-border p-2.5 text-xs shadow-lg backdrop-blur">
          <div className="font-semibold text-foreground">{data[hoveredAxis].axis}</div>
          {series.map((s) => (
            <div key={s.name} className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.stroke }} />
                {s.name}
              </span>
              <span className="font-semibold text-foreground">{data[hoveredAxis][s.key]} / 100</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- SVG AREA / LINE CHART ---
export interface AreaChartProps {
  data: Array<{ year: number | string; invested: number; value: number }>;
  valueFormatter?: (v: number) => string;
}

export const SvgAreaChart: React.FC<AreaChartProps> = ({ data, valueFormatter = (v) => `${v}` }) => {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const margin = { top: 20, right: 20, bottom: 30, left: 45 };
  const width = 500;
  const height = 220;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.invested || 0, d.value || 0)), 1000);

  const getX = (index: number) => margin.left + (index / (data.length - 1 || 1)) * plotW;
  const getY = (val: number) => margin.top + plotH - (val / maxVal) * plotH;

  // Build SVG Path
  const investedPoints = data.map((d, i) => `${getX(i)},${getY(d.invested)}`);
  const valuePoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`);

  const investedLine = `M ${investedPoints.join(" L ")}`;
  const valueLine = `M ${valuePoints.join(" L ")}`;

  const investedArea = `${investedLine} L ${getX(data.length - 1)},${margin.top + plotH} L ${getX(0)},${margin.top + plotH} Z`;
  const valueArea = `${valueLine} L ${getX(data.length - 1)},${margin.top + plotH} L ${getX(0)},${margin.top + plotH} Z`;

  // Grid steps (4 horizontal lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: maxVal * pct,
    y: margin.top + plotH - pct * plotH,
  }));

  // X ticks (max 6 labels)
  const xStep = Math.ceil(data.length / 6);
  const xTicks = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <div
      className="relative h-full w-full select-none"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B5AF0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7B5AF0" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F05AA8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F05AA8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y Axis Ticks */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={margin.left} y1={t.y} x2={width - margin.right} y2={t.y} stroke="currentColor" className="text-border" strokeDasharray="3 3" opacity={0.5} />
            <text x={margin.left - 8} y={t.y} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
              {(t.val / 100000).toFixed(0)}L
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {xTicks.map((d) => {
          const idx = data.indexOf(d);
          return (
            <text key={d.year} x={getX(idx)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              Y{d.year}
            </text>
          );
        })}

        {/* Area Fills */}
        <path d={valueArea} fill="url(#gradValue)" />
        <path d={investedArea} fill="url(#gradInvested)" />

        {/* Lines */}
        <path d={investedLine} fill="none" stroke="#7B5AF0" strokeWidth={2.5} />
        <path d={valueLine} fill="none" stroke="#F05AA8" strokeWidth={2.5} />

        {/* Hover Guideline & Dots */}
        {hoveredIdx !== null && (
          <g>
            <line
              x1={getX(hoveredIdx)}
              y1={margin.top}
              x2={getX(hoveredIdx)}
              y2={margin.top + plotH}
              stroke="currentColor"
              className="text-foreground/40"
              strokeDasharray="2 2"
            />
            <circle cx={getX(hoveredIdx)} cy={getY(data[hoveredIdx].invested)} r={4} fill="#7B5AF0" />
            <circle cx={getX(hoveredIdx)} cy={getY(data[hoveredIdx].value)} r={4} fill="#F05AA8" />
          </g>
        )}

        {/* Overlay Hover Rectangles */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - plotW / (2 * data.length)}
            y={margin.top}
            width={plotW / data.length}
            height={plotH}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
          />
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute pointer-events-none rounded-xl bg-popover/95 border border-border p-2 text-xs shadow-lg backdrop-blur"
          style={{
            left: `${Math.min(80, Math.max(10, (getX(hoveredIdx) / width) * 100))}%`,
            top: "10%",
          }}
        >
          <div className="font-semibold text-foreground">Year {data[hoveredIdx].year}</div>
          <div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#7B5AF0]" />
              Invested:
            </span>
            <span className="font-semibold text-foreground">{valueFormatter(data[hoveredIdx].invested)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#F05AA8]" />
              Value:
            </span>
            <span className="font-semibold text-foreground">{valueFormatter(data[hoveredIdx].value)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
