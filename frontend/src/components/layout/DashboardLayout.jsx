import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import FilterBar from '../common/FilterBar';
import './DashboardLayout.css';

export default function DashboardLayout({ children, hideFilterBar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        {!hideFilterBar && <FilterBar />}
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
