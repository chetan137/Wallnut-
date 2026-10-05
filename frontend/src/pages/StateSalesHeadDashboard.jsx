import { useState } from 'react';
import CEODashboard from './CEODashboard';
import LogSalesCallModal from '../components/common/LogSalesCallModal';
import { useRole } from '../context/RoleContext';
import { PhoneCall } from 'lucide-react';
import './StateSalesHeadDashboard.css';
import './SalesOfficerDashboard.css';

/**
 * State Sales Head: the same dashboard as the CEO (filters, KPI cards, click-through lists, map, tabs),
 * but only for the state(s) the CEO assigned in User Management. `data` is already limited to those
 * states, so every card, chart and list shows only them. With several states, the State filter lists
 * just those states and "All" means all of them together.
 */
export default function StateSalesHeadDashboard({ data }) {
  const { stateScope, selectedState } = useRole();
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const label = stateScope.length ? stateScope.join(' + ') : 'State';

  return (
    <div className="ssh-dashboard" id="ssh-dashboard">
      <div className="dashboard-actions-header">
        <div className="quick-actions-bar">
          <span className="quick-actions-title">Quick Actions:</span>
          <button className="action-btn visit" onClick={() => setIsCallModalOpen(true)}>
            <PhoneCall size={15} /> Log Daily Sales Call
          </button>
        </div>
      </div>

      <CEODashboard
        data={data}
        stateView
        scopeLabel={label}
        controlTitle={`STATE SALES HEAD VIEW — ${label}`}
      />

      <LogSalesCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultState={stateScope[0] || selectedState}
      />
    </div>
  );
}
