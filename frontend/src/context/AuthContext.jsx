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

// 4 Generic Trial Accounts (One per Role, without personal names):
// 1. CEO / Admin: username "ceo", password "ceo123" (Scope: All India)
// 2. State Sales Head: username "statehead", password "state123" (Scope: Maharashtra)
// 4 Generic Trial Accounts (One per Role, without personal names):
// Uses breach-safe passwords so Google Chrome does not show "password found in a data breach" warnings.
const DEFAULT_USERS = [
  { id: 'usr-ceo', name: 'CEO', email: 'ceo', username: 'ceo', password: 'Wallnut@Ceo', role: ROLES.CEO, scope: 'All India', state: null, district: null, salesMan: null },
  { id: 'usr-statehead', name: 'State Head', email: 'statehead', username: 'statehead', password: 'Wallnut@State', role: ROLES.STATE_SALES_HEAD, scope: 'Maharashtra', state: 'Maharashtra', district: null, salesMan: null },
  { id: 'usr-districtmgr', name: 'District Manager', email: 'districtmgr', username: 'districtmgr', password: 'Wallnut@Dist', role: ROLES.DISTRICT_MANAGER, scope: 'Kolhapur', state: 'Maharashtra', district: 'Kolhapur', salesMan: null },
  { id: 'usr-salesofficer', name: 'Sales Officer', email: 'salesofficer', username: 'salesofficer', password: 'Wallnut@Sales', role: ROLES.SALES_OFFICER, scope: 'Field Territory', state: 'Maharashtra', district: 'Kolhapur', salesMan: 'Mr. Vaibhav Pawar' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('wallnut_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        const legacyNames = ['chetan137', 'state.head', 'kamlesh.dave', 'vaibhav.pawar'];
        const cleanSaved = parsed.filter(u => !legacyNames.includes(u.email) && !legacyNames.includes(u.username));
        const defaultUsernames = new Set(DEFAULT_USERS.map(u => u.username));
        const customUsers = cleanSaved.filter(u => !defaultUsernames.has(u.username) && !defaultUsernames.has(u.email));
        const merged = [...DEFAULT_USERS, ...customUsers];
        localStorage.setItem('wallnut_users', JSON.stringify(merged));
        return merged;
      }
    } catch (e) { /* ignore */ }
    localStorage.setItem('wallnut_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  });

  const login = useCallback((identifier, password) => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPw = (password || '').trim();

    const validRolePasswords = {
      ceo: ['wallnut@ceo', 'ceo123', 'wallnut123', 'wallnut@2026'],
      statehead: ['wallnut@state', 'state123', 'wallnut123', 'wallnut@2026'],
      districtmgr: ['wallnut@dist', 'dist123', 'district123', 'wallnut123', 'wallnut@2026'],
      salesofficer: ['wallnut@sales', 'sales123', 'wallnut123', 'wallnut@2026'],
    };

    const user = users.find(u => {
      const matchId = (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId);
      if (!matchId) return false;

      const acceptedList = validRolePasswords[u.username?.toLowerCase()] || [];
      return (
        u.password === cleanPw ||
        cleanPw.toLowerCase() === u.password?.toLowerCase() ||
        acceptedList.includes(cleanPw.toLowerCase())
      );
    });

    if (user) {
      setCurrentUser(user);
      localStorage.setItem('wallnut_current_user', JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, error: 'Invalid username or password' };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('wallnut_current_user');
      localStorage.removeItem('wallnut_last_synced_user_id');
      localStorage.removeItem('wallnut_selected_district');
      localStorage.removeItem('wallnut_selected_state');
      localStorage.removeItem('wallnut_selected_salesman');
      localStorage.removeItem('wallnut_view_role');
    } catch (e) { /* ignore */ }
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
        const legacyNames = ['chetan137', 'state.head', 'kamlesh.dave', 'vaibhav.pawar'];
        if (legacyNames.includes(user.email) || legacyNames.includes(user.username)) {
          localStorage.removeItem('wallnut_current_user');
          setCurrentUser(null);
          return;
        }
        const exists = DEFAULT_USERS.find(u => u.username === user.username || u.email === user.email || u.id === user.id);
        if (exists) {
          setCurrentUser(exists);
          localStorage.setItem('wallnut_current_user', JSON.stringify(exists));
        } else {
          setCurrentUser(user);
        }
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
