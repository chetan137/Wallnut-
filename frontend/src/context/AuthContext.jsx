/**
 * Wallnut — Authentication Context
 * Manages login state, role-based access, and user management.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

export const ROLES = {
  CEO: 'ceo',
  STATE_SALES_HEAD: 'state_sales_head',
  DISTRICT_MANAGER: 'district_manager',
  SALES_OFFICER: 'sales_officer',
};

export const ROLE_LABELS = {
  [ROLES.CEO]: 'CEO / Admin',
  [ROLES.STATE_SALES_HEAD]: 'State Sales Head',
  [ROLES.DISTRICT_MANAGER]: 'District Sales Manager',
  [ROLES.SALES_OFFICER]: 'Sales Officer',
};

export const ROLE_HIERARCHY = [ROLES.CEO, ROLES.STATE_SALES_HEAD, ROLES.DISTRICT_MANAGER, ROLES.SALES_OFFICER];

// Which role can a given role create?
export const CAN_CREATE_ROLE = {
  [ROLES.CEO]: ROLES.STATE_SALES_HEAD,
  [ROLES.STATE_SALES_HEAD]: ROLES.DISTRICT_MANAGER,
  [ROLES.DISTRICT_MANAGER]: ROLES.SALES_OFFICER,
  [ROLES.SALES_OFFICER]: null,
};

// Default users with role-based scopes
const DEFAULT_USERS = [
  { id: '1', name: 'Vikram Mehta', email: 'ceo@wallnut.in', password: 'admin123', role: ROLES.CEO, scope: 'All India', state: null, district: null, salesMan: null },
  { id: '2', name: 'Anand Kulkarni', email: 'mp.head@wallnut.in', password: 'state123', role: ROLES.STATE_SALES_HEAD, scope: 'Madhya Pradesh', state: 'Madhya Pradesh', district: null, salesMan: null },
  { id: '3', name: 'Priya Sharma', email: 'indore.mgr@wallnut.in', password: 'dist123', role: ROLES.DISTRICT_MANAGER, scope: 'Indore', state: 'Madhya Pradesh', district: 'Indore', salesMan: null },
  { id: '4', name: 'Rahul Joshi', email: 'bhopal.mgr@wallnut.in', password: 'dist123', role: ROLES.DISTRICT_MANAGER, scope: 'Bhopal', state: 'Madhya Pradesh', district: 'Bhopal', salesMan: null },
  { id: '5', name: 'Rajesh Sharma', email: 'rajesh@wallnut.in', password: 'sales123', role: ROLES.SALES_OFFICER, scope: 'Rajesh Sharma', state: 'Madhya Pradesh', district: 'Indore', salesMan: 'Rajesh Sharma' },
  { id: '6', name: 'Amit Verma', email: 'amit@wallnut.in', password: 'sales123', role: ROLES.SALES_OFFICER, scope: 'Amit Verma', state: 'Madhya Pradesh', district: 'Indore', salesMan: 'Amit Verma' },
  { id: '7', name: 'Sunil Patel', email: 'sunil@wallnut.in', password: 'sales123', role: ROLES.SALES_OFFICER, scope: 'Sunil Patel', state: 'Madhya Pradesh', district: 'Bhopal', salesMan: 'Sunil Patel' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('wallnut_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const login = useCallback((email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('wallnut_current_user', JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('wallnut_current_user');
  }, []);

  const addUser = useCallback((newUser) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    const creatableRole = CAN_CREATE_ROLE[currentUser.role];
    if (!creatableRole || creatableRole !== newUser.role) {
      return { success: false, error: 'You cannot create users with this role' };
    }

    if (users.some(u => u.email === newUser.email)) {
      return { success: false, error: 'Email already exists' };
    }

    const user = {
      ...newUser,
      id: String(Date.now()),
      createdBy: currentUser.id,
    };

    const updated = [...users, user];
    setUsers(updated);
    localStorage.setItem('wallnut_users', JSON.stringify(updated));
    return { success: true, user };
  }, [currentUser, users]);

  const deleteUser = useCallback((userId) => {
    if (!currentUser) return { success: false };
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'User not found' };

    const creatableRole = CAN_CREATE_ROLE[currentUser.role];
    if (target.role !== creatableRole) {
      return { success: false, error: 'Cannot delete this user' };
    }

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    localStorage.setItem('wallnut_users', JSON.stringify(updated));
    return { success: true };
  }, [currentUser, users]);

  const getManagedUsers = useCallback(() => {
    if (!currentUser) return [];
    const creatableRole = CAN_CREATE_ROLE[currentUser.role];
    if (!creatableRole) return [];

    return users.filter(u => {
      if (u.role !== creatableRole) return false;
      // Scope check: only show users within the manager's scope
      if (currentUser.role === ROLES.CEO) return true;
      if (currentUser.role === ROLES.STATE_SALES_HEAD) return u.state === currentUser.state;
      if (currentUser.role === ROLES.DISTRICT_MANAGER) return u.district === currentUser.district;
      return false;
    });
  }, [currentUser, users]);

  // Filter sales data by user's role/scope
  const getDataFilter = useCallback(() => {
    if (!currentUser) return () => false;

    switch (currentUser.role) {
      case ROLES.CEO:
      case ROLES.STATE_SALES_HEAD:
        return () => true; // All data (our mock data is all MP)
      case ROLES.DISTRICT_MANAGER:
        return (row) => row.areaCity === currentUser.district;
      case ROLES.SALES_OFFICER:
        return (row) => row.salesMan === currentUser.salesMan;
      default:
        return () => false;
    }
  }, [currentUser]);

  const canManageUsers = useMemo(() => {
    return currentUser && CAN_CREATE_ROLE[currentUser.role] !== null;
  }, [currentUser]);

  // Restore session on mount
  useState(() => {
    const saved = localStorage.getItem('wallnut_current_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        // Verify user still exists
        const exists = (localStorage.getItem('wallnut_users')
          ? JSON.parse(localStorage.getItem('wallnut_users'))
          : DEFAULT_USERS
        ).find(u => u.id === user.id);
        if (exists) setCurrentUser(exists);
      } catch {}
    }
  });

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    addUser,
    deleteUser,
    getManagedUsers,
    getDataFilter,
    canManageUsers,
    users,
    ROLES,
    ROLE_LABELS,
    ROLE_HIERARCHY,
    CAN_CREATE_ROLE,
  }), [currentUser, login, logout, addUser, deleteUser, getManagedUsers, getDataFilter, canManageUsers, users]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
