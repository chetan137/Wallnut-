import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import FilterBar from '../common/FilterBar';
import { useRole, ROLES } from '../../context/RoleContext';
import './DashboardLayout.css';

export default function DashboardLayout({ children, hideFilterBar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentRole } = useRole();

  return (
    <div className="dashboard-layout">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="dashboard-main">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        {/* BUG FIX: this used to render unconditionally on every route,
            including pages (Financials, Analytics, e-Way Bills, Workflow,
            About, Users) that never read RoleContext's filters — every
            dropdown/search here looked live but silently did nothing on
            those pages. Only /dashboard's role dashboards actually consume
            filteredSales, so it's hidden everywhere else. */}
        {/* The CEO dashboard has its own filter bar (State > District > City, officer, dealer). */}
        {!hideFilterBar && currentRole !== ROLES.CEO && <FilterBar />}
        <main className="dashboard-content">
          {children}
        </main>
        <footer className="dashboard-footer" id="main-footer">
          <span className="footer-left">© 2026 Wallnut Building Materials Pvt. Ltd. All rights reserved.</span>
          <span className="footer-right">Eco-Industrial Innovation • Mumbai • Vadodara • Kolhapur</span>
        </footer>
      </div>
    </div>
  );
}
