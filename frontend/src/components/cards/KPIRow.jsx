import { IndianRupee, Users, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import { abbreviateCurrency, formatNumber } from '../../utils/formatters';

export default function KPIRow({ metrics, isYearly = false, showBothTrends = false }) {
  const trendLabel = isYearly ? 'vs last year' : 'vs last month';

  const asTrends = (monthValue, yearValue) => showBothTrends ? [
    { value: monthValue, label: 'vs last month' },
    { value: yearValue, label: 'vs last year' },
  ] : null;

  const salesTrends = asTrends(metrics.salesTrendMonth, metrics.salesTrend);
  const dealersTrends = asTrends(metrics.dealersTrendMonth, metrics.dealersTrend);
  const outstandingTrends = asTrends(metrics.outstandingTrendMonth, metrics.outstandingTrend);

  return (
    <div className="kpi-row stagger-children" id="kpi-row">
      <KPICard
        icon={IndianRupee}
        label="Total Sales"
        description="Gross sell amount — total invoiced value in the selected period"
        value={abbreviateCurrency(metrics.totalSales)}
        trend={showBothTrends ? null : metrics.salesTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={salesTrends}
        color="green"
      />
      <KPICard
        icon={Users}
        label="Active Dealers"
        description="Unique dealers who billed at least once in this period"
        value={formatNumber(metrics.activeDealers)}
        trend={showBothTrends ? null : metrics.dealersTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={dealersTrends}
        color="blue"
      />
      <KPICard
        icon={AlertCircle}
        label="Outstanding Amount"
        description="Unpaid receivable value against bills raised in this period"
        value={abbreviateCurrency(metrics.totalOutstanding)}
        trend={showBothTrends ? null : metrics.outstandingTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={outstandingTrends}
        color="orange"
      />
    </div>
  );
}
