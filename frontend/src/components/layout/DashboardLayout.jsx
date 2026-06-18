import Sidebar from './Sidebar';
import Header from './Header';
import './DashboardLayout.css';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
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
