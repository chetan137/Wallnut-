import { IndianRupee, Users, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import { abbreviateCurrency, formatNumber } from '../../utils/formatters';

export default function KPIRow({ metrics, isYearly = false, showBothTrends = false, descriptions = {}, onCardClick = {} }) {
  const trendLabel = isYearly ? 'vs last year' : 'vs last month';

  // What the +/- % on each card means (matches the calculation in CEODashboard).
  const MONTH_HELP = "(this month so far - last month up to the same day) / last month up to the same day x 100. Shown only after the 10th of the month, because earlier in the month the comparison swings too much.";
  const YEAR_HELP = "(this Financial Year - last Financial Year) / last Financial Year x 100, comparing only the calendar months present in both years (e.g. Apr-Sep against Apr-Sep). Hidden when the two years share no month.";
  const asTrends = (monthValue, yearValue) => showBothTrends ? [
    { value: monthValue, label: 'vs last month', help: MONTH_HELP },
    { value: yearValue, label: 'vs last year', help: YEAR_HELP },
  ] : null;

  const salesTrends = asTrends(metrics.salesTrendMonth, metrics.salesTrend);
  const dealersTrends = asTrends(metrics.dealersTrendMonth, metrics.dealersTrend);
  const outstandingTrends = asTrends(metrics.outstandingTrendMonth, metrics.outstandingTrend);

  return (
    <div className="kpi-row stagger-children" id="kpi-row">
      <KPICard
        icon={IndianRupee}
        label="Net Sales (Excl. GST)"
        description={descriptions.sales || "Net taxable sales amount without GST in the selected period"}
        value={abbreviateCurrency(metrics.totalSales)}
        trend={showBothTrends ? null : metrics.salesTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={salesTrends}
        color="green"
        onClick={onCardClick.sales}
      />
      <KPICard
        icon={Users}
        label="Active Dealers"
        description={descriptions.dealers || "Unique dealers who billed at least once in this period"}
        value={formatNumber(metrics.activeDealers)}
        trend={showBothTrends ? null : metrics.dealersTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={dealersTrends}
        color="blue"
        onClick={onCardClick.dealers}
      />
      <KPICard
        icon={AlertCircle}
        label="Outstanding Amount"
        description={descriptions.outstanding || "Unpaid receivable value against bills raised in this period"}
        value={abbreviateCurrency(metrics.totalOutstanding)}
        trend={showBothTrends ? null : metrics.outstandingTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={outstandingTrends}
        color="orange"
        onClick={onCardClick.outstanding}
      />
    </div>
  );
}
