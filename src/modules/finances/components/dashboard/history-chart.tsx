import { formatCents } from "@/shared/lib/money";
import type { MonthPoint } from "../../domain/dashboard";
import { formatSignedCents, monthName } from "../format";
import { Card } from "./card";

const WIDTH = 640;
const LINE_HEIGHT = 120;
const BAR_HEIGHT = 80;
const GAP = 28;
const LABELS = 18;

/** 12 months: total balance (line) and monthly trend (bars), drawn in plain SVG. */
export function HistoryChart({ history }: { history: MonthPoint[] }) {
  const points = history.filter((point) => point.hasData);
  if (points.length < 2) {
    return (
      <Card title="Évolution sur 12 mois" className="lg:col-span-2">
        <p className="text-sm text-muted-foreground">Pas encore assez d&apos;historique.</p>
      </Card>
    );
  }

  const step = WIDTH / history.length;
  const x = (index: number) => step * index + step / 2;
  const totals = points.map((point) => point.totalCents);
  const minTotal = Math.min(...totals, 0);
  const maxTotal = Math.max(...totals, 1);
  const yTotal = (cents: number) => 8 + (1 - (cents - minTotal) / (maxTotal - minTotal || 1)) * (LINE_HEIGHT - 16);
  const maxTrend = Math.max(...points.map((point) => Math.abs(point.trendCents)), 1);
  const barsTop = LINE_HEIGHT + GAP;
  const zero = barsTop + BAR_HEIGHT / 2;
  const barScale = (BAR_HEIGHT / 2 - 4) / maxTrend;

  const indexed = history.map((point, index) => ({ point, index })).filter(({ point }) => point.hasData);
  const line = indexed.map(({ point, index }) => `${x(index).toFixed(1)},${yTotal(point.totalCents).toFixed(1)}`).join(" ");
  const last = points.at(-1);

  return (
    <Card
      title="Évolution sur 12 mois"
      className="lg:col-span-2"
      aside={last ? <span className="tabular-nums">Total actuel {formatCents(last.totalCents)}</span> : null}
    >
      <svg viewBox={`0 0 ${WIDTH} ${barsTop + BAR_HEIGHT + LABELS}`} className="w-full" role="img" aria-labelledby="history-title">
        <title id="history-title">Solde total en fin de mois et tendance mensuelle sur les 12 derniers mois</title>
        <text x="0" y="10" className="fill-muted-foreground text-[11px]">
          Solde total
        </text>
        <polyline points={line} fill="none" strokeWidth="2.5" className="stroke-primary" strokeLinejoin="round" />
        {indexed.map(({ point, index }) => (
          <circle key={point.key} cx={x(index)} cy={yTotal(point.totalCents)} r="3.5" className="fill-primary">
            <title>{`${monthName(point.month)} ${point.year} : ${formatCents(point.totalCents)}`}</title>
          </circle>
        ))}

        <text x="0" y={barsTop - 6} className="fill-muted-foreground text-[11px]">
          Tendance du mois
        </text>
        <line x1="0" x2={WIDTH} y1={zero} y2={zero} className="stroke-border" />
        {indexed.map(({ point, index }) => {
          const height = Math.max(Math.abs(point.trendCents) * barScale, 1);
          const positive = point.trendCents >= 0;
          return (
            <rect
              key={point.key}
              x={x(index) - step * 0.3}
              width={step * 0.6}
              y={positive ? zero - height : zero}
              height={height}
              rx="3"
              className={positive ? "fill-positive" : "fill-destructive"}
            >
              {/* <title> must have a single text child (React 19), hence one template string. */}
              <title>
                {`${monthName(point.month)} ${point.year} : ${formatSignedCents(point.trendCents)} (apports ${formatCents(point.incomeCents)}, dépenses ${formatCents(point.expenseCents)})`}
              </title>
            </rect>
          );
        })}

        {history.map((point, index) => (
          <text
            key={point.key}
            x={x(index)}
            y={barsTop + BAR_HEIGHT + LABELS - 4}
            textAnchor="middle"
            className={`text-[11px] ${index === history.length - 1 ? "fill-foreground font-semibold" : "fill-muted-foreground"}`}
          >
            {monthName(point.month, "short").replace(".", "")}
          </text>
        ))}
      </svg>
    </Card>
  );
}
