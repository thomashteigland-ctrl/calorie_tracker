import { useMemo, useState } from "react";
import type { CumulativeDeficitPoint } from "../lib/cumulativeDeficit";

type Props = {
  points: CumulativeDeficitPoint[];
};

const W = 320;
const H = 160;
const PAD = { top: 12, right: 14, bottom: 28, left: 36 };

function xAt(index: number, count: number): number {
  const innerW = W - PAD.left - PAD.right;
  if (count <= 1) return PAD.left + innerW / 2;
  return PAD.left + (index / (count - 1)) * innerW;
}

function xPercent(index: number, count: number): number {
  return (xAt(index, count) / W) * 100;
}

function xLabelAnchor(index: number, count: number): "start" | "middle" | "end" {
  if (count <= 1) return "middle";
  if (index === 0) return "start";
  if (index === count - 1) return "end";
  return "middle";
}

function yAt(value: number, minY: number, maxY: number): number {
  const innerH = H - PAD.top - PAD.bottom;
  const span = maxY - minY || 1;
  return PAD.top + innerH - ((value - minY) / span) * innerH;
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function buildYScale(allY: number[]): { minY: number; maxY: number; ticks: number[] } {
  const dataMin = Math.min(0, ...allY);
  const dataMax = Math.max(0, ...allY);
  const margin = Math.max(40, (dataMax - dataMin) * 0.12 || 40);

  let minY = dataMin < 0 ? dataMin - margin * 0.15 : 0;
  let maxY = dataMax > 0 ? dataMax + margin * 0.15 : 0;
  if (minY === maxY) {
    minY = -80;
    maxY = 80;
  }

  const ticks: number[] = [];
  if (minY < -1) ticks.push(Math.round(minY));
  ticks.push(0);
  if (maxY > 1) ticks.push(Math.round(maxY));

  return { minY, maxY, ticks: [...new Set(ticks)].sort((a, b) => a - b) };
}

function formatKcalValue(kcal: number): string {
  const n = Math.round(kcal);
  if (n > 0) return `+${n}`;
  return `${n}`;
}

export function CumulativeDeficitChart({ points }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (points.length === 0) return null;

    const allY = points.flatMap((p) => [p.targetCumulative, p.actualCumulative]);
    const { minY, maxY, ticks } = buildYScale(allY);

    const targetPts = points.map((p, i) => ({
      x: xAt(i, points.length),
      y: yAt(p.targetCumulative, minY, maxY),
    }));
    const actualPts = points.map((p, i) => ({
      x: xAt(i, points.length),
      y: yAt(p.actualCumulative, minY, maxY),
      onTrack: p.onTrack,
    }));

    const zeroY = yAt(0, minY, maxY);

    return { minY, maxY, ticks, targetPts, actualPts, zeroY };
  }, [points]);

  if (!layout || points.length === 0) {
    return (
      <p className="deficit-chart__empty">
        Close your diary to see cumulative deficit vs your plan.
      </p>
    );
  }

  const { targetPts, actualPts, zeroY, ticks, minY, maxY } = layout;
  const hoveredPoint = hovered != null ? points[hovered] : null;

  const actualSegments = actualPts.slice(1).map((pt, i) => ({
    d: `M ${actualPts[i].x.toFixed(1)} ${actualPts[i].y.toFixed(1)} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    onTrack: pt.onTrack,
  }));

  const hitHalfWidth =
    points.length <= 1 ? (W - PAD.left - PAD.right) / 2 : (W - PAD.left - PAD.right) / (points.length - 1) / 2;

  return (
    <div className="deficit-chart">
      {hoveredPoint ? (
        <div
          className="deficit-chart__tooltip"
          style={{ left: `${xPercent(hovered!, points.length)}%` }}
          role="tooltip"
        >
          <div className="deficit-chart__tooltip-row">
            <span className="deficit-chart__tooltip-label">Target</span>
            <span className="deficit-chart__tooltip-value">
              {formatKcalValue(hoveredPoint.targetCumulative)}
            </span>
          </div>
          <div className="deficit-chart__tooltip-row">
            <span className="deficit-chart__tooltip-label">You</span>
            <span className="deficit-chart__tooltip-value">
              {formatKcalValue(hoveredPoint.actualCumulative)}
            </span>
          </div>
        </div>
      ) : null}

      <svg
        className="deficit-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Cumulative deficit vs target over closed diary days"
        onMouseLeave={() => setHovered(null)}
      >
        <title>Cumulative deficit tracking</title>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(tick, minY, maxY)}
              y2={yAt(tick, minY, maxY)}
              className="deficit-chart__grid"
            />
            <text
              x={PAD.left - 6}
              y={yAt(tick, minY, maxY) + 4}
              textAnchor="end"
              className="deficit-chart__tick"
            >
              {tick === 0 ? "0" : `${Math.round(tick)}`}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY}
          y2={zeroY}
          className="deficit-chart__zero"
        />

        <path d={polyline(targetPts)} className="deficit-chart__line deficit-chart__line--target" fill="none" />

        {actualSegments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            className={`deficit-chart__line deficit-chart__line--actual${seg.onTrack ? "" : " deficit-chart__line--off"}`}
            fill="none"
          />
        ))}

        {hovered != null ? (
          <line
            x1={xAt(hovered, points.length)}
            x2={xAt(hovered, points.length)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            className="deficit-chart__cursor"
          />
        ) : null}

        {points.map((p, i) => (
          <g key={p.logged_date}>
            <rect
              x={xAt(i, points.length) - hitHalfWidth}
              y={PAD.top}
              width={hitHalfWidth * 2}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              className="deficit-chart__hit"
              onMouseEnter={() => setHovered(i)}
            />
            <text
              x={xAt(i, points.length)}
              y={H - 8}
              textAnchor={xLabelAnchor(i, points.length)}
              className="deficit-chart__label"
              pointerEvents="none"
            >
              {p.dateLabel}
            </text>
            {hovered === i ? (
              <>
                <circle
                  cx={targetPts[i].x}
                  cy={targetPts[i].y}
                  r={4}
                  className="deficit-chart__dot deficit-chart__dot--target"
                />
                <circle
                  cx={actualPts[i].x}
                  cy={actualPts[i].y}
                  r={4}
                  className={`deficit-chart__dot deficit-chart__dot--actual${p.onTrack ? "" : " deficit-chart__dot--off"}`}
                />
              </>
            ) : null}
          </g>
        ))}
      </svg>

      <ul className="deficit-chart__legend">
        <li>
          <span className="deficit-chart__swatch deficit-chart__swatch--target" />
          Target
        </li>
        <li>
          <span className="deficit-chart__swatch deficit-chart__swatch--actual" />
          You
        </li>
      </ul>
    </div>
  );
}
