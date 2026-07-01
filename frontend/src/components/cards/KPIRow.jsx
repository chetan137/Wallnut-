import { IndianRupee, Users, AlertCircle, Target } from 'lucide-react';
import KPICard from './KPICard';
import { abbreviateCurrency, formatNumber, formatPercent } from '../../utils/formatters';

export default function KPIRow({ metrics, isYearly = false, showBothTrends = false }) {
  const trendLabel = isYearly ? 'vs last year' : 'vs last month';
  
  const salesTrends = showBothTrends ? [
    { value: metrics.salesTrendMonth, label: 'vs last month' },
    { value: metrics.salesTrend, label: 'vs last year' }
  ] : null;
  
  return (
    <div className="kpi-row stagger-children" id="kpi-row">
      <KPICard
        icon={IndianRupee}
        label="Total Sales"
        value={abbreviateCurrency(metrics.totalSales)}
        trend={showBothTrends ? null : metrics.salesTrend}
        trendLabel={showBothTrends ? null : trendLabel}
        trends={salesTrends}
        color="green"
      />
      <KPICard
        icon={Users}
        label="Active Dealers"
        value={formatNumber(metrics.activeDealers)}
        color="blue"
      />
      <KPICard
        icon={AlertCircle}
        label="Outstanding Amount"
        value={abbreviateCurrency(metrics.totalOutstanding)}
        color="orange"
      />
      <KPICard
        icon={Target}
        label="Target Achievement"
        value={formatPercent(metrics.targetAchievement)}
        color={metrics.targetAchievement >= 100 ? 'green' : 'red'}
      />
    </div>
  );
}
