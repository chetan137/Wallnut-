/**
 * Wallnut — Authentication Context
 * Manages login state (server-verified) and CEO-only user management.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

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

const API_KEY = import.meta.env.VITE_API_KEY || '';
const TOKEN_KEY = 'wallnut_auth_token';

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

// Calls the user-management API. Resolves to { ok, ...body } and never throws,
// so callers can show body.error directly.
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'X-API-Key': API_KEY };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`/api/users${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok === true, status: res.status, ...json };
  } catch {
    return { ok: false, status: 0, error: 'Could not reach the server' };
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wallnut_current_user');
      return saved && getToken() ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [users, setUsers] = useState([]);

  const clearSession = useCallback(() => {
    setCurrentUser(null);
    setUsers([]);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('wallnut_current_user');
      localStorage.removeItem('wallnut_last_synced_user_id');
      localStorage.removeItem('wallnut_selected_district');
      localStorage.removeItem('wallnut_selected_state');
      localStorage.removeItem('wallnut_selected_salesman');
      localStorage.removeItem('wallnut_view_role');
    } catch (e) { /* ignore */ }
  }, []);

  const refreshUsers = useCallback(async () => {
    const res = await api('/');
    if (res.ok && Array.isArray(res.users)) {
      setUsers(res.users);
    } else if (!res.ok) {
      setUsers([]);
    }
    return res;
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await api('/login', { method: 'POST', body: { username: identifier, password } });
    if (!res.ok) return { success: false, error: res.error || 'Invalid username or password' };
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem('wallnut_current_user', JSON.stringify(res.user));
    } catch (e) { /* ignore */ }
    setCurrentUser(res.user);
    return { success: true, user: res.user };
  }, []);

  const logout = clearSession;

  // Re-validate a restored session against the server: picks up role/scope
  // changes the CEO made, and signs out accounts that were disabled or removed.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    api('/me').then((res) => {
      if (cancelled) return;
      if (res.status === 401) return clearSession();
      if (res.ok) {
        setCurrentUser(res.user);
        try { localStorage.setItem('wallnut_current_user', JSON.stringify(res.user)); } catch (e) { /* ignore */ }
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const canManageUsers = useMemo(() => currentUser?.role === ROLES.CEO, [currentUser]);

  useEffect(() => {
    if (canManageUsers) refreshUsers();
  }, [canManageUsers, refreshUsers]);

  // CEO-only CRUD. The server enforces this too; these just keep local state in sync.
  const addUser = useCallback(async (data) => {
    const res = await api('/', { method: 'POST', body: data });
    if (res.ok && res.user) setUsers((prev) => [...(Array.isArray(prev) ? prev : []), res.user]);
    return res.ok ? { success: true, user: res.user } : { success: false, error: res.error };
  }, []);

  const updateUser = useCallback(async (id, data) => {
    const res = await api(`/${id}`, { method: 'PUT', body: data });
    if (res.ok && res.user) {
      setUsers((prev) => (Array.isArray(prev) ? prev : []).map((u) => (u.id === id ? res.user : u)));
      if (id === currentUser?.id) setCurrentUser(res.user);
    }
    return res.ok ? { success: true, user: res.user } : { success: false, error: res.error };
  }, [currentUser?.id]);

  const deleteUser = useCallback(async (id) => {
    const res = await api(`/${id}`, { method: 'DELETE' });
    if (res.ok) setUsers((prev) => (Array.isArray(prev) ? prev : []).filter((u) => u.id !== id));
    return res.ok ? { success: true } : { success: false, error: res.error };
  }, []);

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

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers,
    getDataFilter,
    canManageUsers,
    users,
    ROLES,
    ROLE_LABELS,
    ROLE_HIERARCHY,
  }), [currentUser, login, logout, addUser, updateUser, deleteUser, refreshUsers, getDataFilter, canManageUsers, users]);

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
