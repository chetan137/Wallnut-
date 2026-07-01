import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import FilterBar from '../common/FilterBar';
import './DashboardLayout.css';

export default function DashboardLayout({ children }) {
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
        <FilterBar />
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
