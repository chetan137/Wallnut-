import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';
import LoginPage from './pages/LoginPage';
import ManageUsers from './pages/ManageUsers';
import SystemWorkflow from './pages/SystemWorkflow';
import AboutPage from './pages/AboutPage';
import CEODashboard from './pages/CEODashboard';
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
  const { currentRole, setRole, setSelectedDistrict, setSelectedSalesMan, filteredSales } = useRole();
  const [syncedUserId, setSyncedUserId] = useState(null);

  // Sync user credentials to view scope on login / user switch
  useEffect(() => {
    if (currentUser && currentUser.id !== syncedUserId) {
      setSyncedUserId(currentUser.id);
      
      // Update role view to match user's actual role
      setRole(currentUser.role);
      
      // Update district/salesman scope filters to match user's credentials
      if (currentUser.role === ROLES.DISTRICT_MANAGER && currentUser.district) {
        setSelectedDistrict(currentUser.district);
      } else if (currentUser.role === ROLES.SALES_OFFICER && currentUser.salesMan) {
        setSelectedSalesMan(currentUser.salesMan);
        if (currentUser.district) {
          setSelectedDistrict(currentUser.district);
        }
      }
    }
  }, [currentUser, syncedUserId, setRole, setSelectedDistrict, setSelectedSalesMan]);

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
            <DashboardLayout>
              <ManageUsers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflow"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SystemWorkflow />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <DashboardLayout>
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
