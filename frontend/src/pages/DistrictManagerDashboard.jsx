import { useState } from 'react';
import CEODashboard from './CEODashboard';
import LogSalesCallModal from '../components/common/LogSalesCallModal';
import { useRole } from '../context/RoleContext';
import { PhoneCall } from 'lucide-react';
import './StateSalesHeadDashboard.css';
import './SalesOfficerDashboard.css';

/**
 * District Manager: the same dashboard as the CEO (filters, KPI cards, click-through lists, map, tabs),
 * but only for the district the CEO assigned in User Management. `data` is already limited to that
 * district, so every card, chart and list shows only it.
 */
export default function DistrictManagerDashboard({ data }) {
  const { selectedDistrict } = useRole();
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  return (
    <div className="ssh-dashboard" id="dm-dashboard">
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
        districtView
        scopeLabel={selectedDistrict || 'District'}
        controlTitle={`DISTRICT MANAGER VIEW — ${selectedDistrict || ''}`}
      />

      <LogSalesCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultDistrict={selectedDistrict}
      />
    </div>
  );
}
