import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';
import LoginPage from './pages/LoginPage';
import ManageUsers from './pages/ManageUsers';
import SystemWorkflow from './pages/SystemWorkflow';
import AboutPage from './pages/AboutPage';
import CEODashboard from './pages/CEODashboard';
import FinancialsPage from './pages/FinancialsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EwayBillsPage from './pages/EwayBillsPage';
import StateSalesHeadDashboard from './pages/StateSalesHeadDashboard';
import DistrictManagerDashboard from './pages/DistrictManagerDashboard';
import SalesOfficerDashboard from './pages/SalesOfficerDashboard';
import DashboardLayout from './components/layout/DashboardLayout';

// Route guards
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

// Synced Dashboard Router
function DashboardContainer() {
  const { currentUser } = useAuth();
  const {
    currentRole,
    setRole,
    setSelectedState,
    setSelectedDistrict,
    setSelectedSalesMan,
    filteredSales,
  } = useRole();
  const [syncedUserId, setSyncedUserId] = useState(() => {
    try {
      return localStorage.getItem('wallnut_last_synced_user_id') || null;
    } catch {
      return null;
    }
  });

  // Sync user credentials to view scope on login / user switch
  useEffect(() => {
    if (currentUser && currentUser.id !== syncedUserId) {
      setSyncedUserId(currentUser.id);
      try {
        localStorage.setItem('wallnut_last_synced_user_id', currentUser.id);
      } catch (e) { /* ignore */ }
      
      // Update role view: for CEO, preserve saved view role if present; otherwise default to CEO
      const savedRole = localStorage.getItem('wallnut_view_role');
      if (currentUser.role === ROLES.CEO) {
        if (!savedRole) setRole(ROLES.CEO);
      } else {
        setRole(currentUser.role);
      }
      
      // Update state/district/salesman scope filters: preserve any existing user selection in localStorage
      const savedState = localStorage.getItem('wallnut_selected_state');
      const savedDistrict = localStorage.getItem('wallnut_selected_district');
      const savedSalesMan = localStorage.getItem('wallnut_selected_salesman');

      if (currentUser.role === ROLES.STATE_SALES_HEAD) {
        if (savedState) {
          setSelectedState(savedState);
        } else if (currentUser.state) {
          setSelectedState(currentUser.state);
        }
      } else if (currentUser.role === ROLES.DISTRICT_MANAGER) {
        if (savedDistrict) {
          setSelectedDistrict(savedDistrict);
        } else if (currentUser.district) {
          setSelectedDistrict(currentUser.district);
        }
        if (savedState) {
          setSelectedState(savedState);
        } else if (currentUser.state) {
          setSelectedState(currentUser.state);
        }
      } else if (currentUser.role === ROLES.SALES_OFFICER) {
        if (savedSalesMan) {
          setSelectedSalesMan(savedSalesMan);
        } else if (currentUser.salesMan) {
          setSelectedSalesMan(currentUser.salesMan);
        }
        if (savedDistrict) {
          setSelectedDistrict(savedDistrict);
        } else if (currentUser.district) {
          setSelectedDistrict(currentUser.district);
        }
        if (savedState) {
          setSelectedState(savedState);
        } else if (currentUser.state) {
          setSelectedState(currentUser.state);
        }
      }
    }
  }, [currentUser, syncedUserId, setRole, setSelectedState, setSelectedDistrict, setSelectedSalesMan]);

  // Restrict non-CEO accounts strictly to their own assigned dashboard role
  useEffect(() => {
    if (currentUser && currentUser.role !== ROLES.CEO && currentRole !== currentUser.role) {
      setRole(currentUser.role);
    }
  }, [currentUser, currentRole, setRole]);

  // Render correct dashboard component based on selected view role
  switch (currentRole) {
    case ROLES.CEO:
      return <CEODashboard data={filteredSales} />;
    case ROLES.STATE_SALES_HEAD:
      return <StateSalesHeadDashboard data={filteredSales} />;
    case ROLES.DISTRICT_MANAGER:
      return <DistrictManagerDashboard data={filteredSales} />;
    case ROLES.SALES_OFFICER:
      return <SalesOfficerDashboard data={filteredSales} />;
    default:
      return (
        <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
          Loading dashboard...
        </div>
      );
  }
}

function MainApp() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Authenticated Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardContainer />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <ManageUsers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financials"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <FinancialsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <AnalyticsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/eway-bills"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <EwayBillsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflow"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <SystemWorkflow />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <DashboardLayout hideFilterBar>
              <AboutPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <MainApp />
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
