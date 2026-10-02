import { useState, useMemo } from 'react';
import { useAuth, ROLES, ROLE_LABELS, ROLE_HIERARCHY } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { UserPlus, Trash2, Pencil } from 'lucide-react';
import './ManageUsers.css';

const EMPTY_FORM = { name: '', username: '', password: '', role: ROLES.SALES_OFFICER, state: '', district: '', salesMan: '', active: true };

export default function ManageUsers() {
  const { currentUser, users = [], addUser, updateUser, deleteUser, canManageUsers } = useAuth();
  const { allStates = [], allDistricts = [], allSalesOfficers = [] } = useRole();
  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, or a user object
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState(EMPTY_FORM);

  const userList = Array.isArray(users) ? users : [];

  const visibleUsers = useMemo(
    () => userList.filter((u) => roleFilter === 'all' || u.role === roleFilter),
    [userList, roleFilter]
  );

  if (!canManageUsers) {
    return (
      <div className="manage-users-page">
        <h2 className="manage-users-title">User Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Only the CEO can manage users.</p>
      </div>
    );
  }

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditing('new');
  };

  const openEdit = (user) => {
    setForm({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      state: user.state || '',
      district: user.district || '',
      salesMan: user.salesMan || '',
      active: user.active,
    });
    setFormError('');
    setEditing(user);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Picking a sales person from the Tally list also fills in their area.
  const pickSalesMan = (e) => {
    const name = e.target.value;
    const match = allSalesOfficers.find((o) => o.name === name);
    setForm((f) => ({
      ...f,
      salesMan: name,
      state: match?.state || f.state,
      district: match?.district || f.district,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const isNew = editing === 'new';
    const payload = {
      name: form.name,
      username: form.username,
      role: form.role,
      state: form.role === ROLES.CEO ? '' : form.state,
      district: form.role === ROLES.DISTRICT_MANAGER || form.role === ROLES.SALES_OFFICER ? form.district : '',
      salesMan: form.role === ROLES.SALES_OFFICER ? form.salesMan : '',
      active: form.active,
    };
    if (isNew || form.password) payload.password = form.password;

    setSaving(true);
    const result = isNew ? await addUser(payload) : await updateUser(editing.id, payload);
    setSaving(false);
    if (result.success) setEditing(null);
    else setFormError(result.error || 'Something went wrong');
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Remove ${user.name} (${user.username})? They will no longer be able to sign in.`)) return;
    const result = await deleteUser(user.id);
    if (!result.success) window.alert(result.error);
  };

  const isNew = editing === 'new';

  return (
    <div className="manage-users-page">
      <div className="manage-users-header">
        <div>
          <h2 className="manage-users-title">User Management</h2>
          <p className="manage-users-subtitle">
            Add, edit, replace or remove dashboard logins. These accounts are separate from Tally.
          </p>
        </div>
        <button className="add-user-btn" onClick={openCreate} id="add-user-btn">
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      <div className="users-filter-row">
        {['all', ...ROLE_HIERARCHY].map((r) => (
          <button
            key={r}
            className={`users-filter-chip ${roleFilter === r ? 'active' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r === 'all' ? `All (${userList.length})` : `${ROLE_LABELS[r]} (${userList.filter((u) => u.role === r).length})`}
          </button>
        ))}
      </div>

      <div className="users-grid">
        {visibleUsers.map((user) => (
          <div key={user.id} className={`user-card ${user.active ? '' : 'inactive'}`}>
            <div className="user-card-top">
              <div className="user-card-avatar">{user.name.charAt(0)}</div>
              <div className="user-card-actions">
                <button className="user-card-delete" onClick={() => openEdit(user)} title="Edit user">
                  <Pencil size={15} />
                </button>
                {currentUser && user.id !== currentUser.id && (
                  <button className="user-card-delete" onClick={() => handleDelete(user)} title="Remove user">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            <div className="user-card-name">{user.name}{currentUser && user.id === currentUser.id && ' (you)'}</div>
            <div className="user-card-email">{user.username}</div>
            <div className="user-card-meta">
              <span className="user-card-badge role">{ROLE_LABELS[user.role]}</span>
              <span className="user-card-badge scope">{user.salesMan || user.scope}</span>
              {!user.active && <span className="user-card-badge disabled">Disabled</span>}
            </div>
          </div>
        ))}

        {visibleUsers.length === 0 && (
          <div style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>No users found.</div>
        )}
      </div>

      {editing && (
        <div className="add-user-overlay" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="add-user-modal">
            <h3 className="add-user-modal-title">{isNew ? 'Add User' : `Edit ${editing.name}`}</h3>
            <form className="add-user-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <input className="login-input" type="text" value={form.name} onChange={set('name')} required />
              </div>

              <div className="login-field">
                <label className="login-label">Username</label>
                <input className="login-input" type="text" value={form.username} onChange={set('username')} autoComplete="off" required />
              </div>

              <div className="login-field">
                <label className="login-label">{isNew ? 'Password' : 'New Password (leave blank to keep current)'}</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  required={isNew}
                />
              </div>

              <div className="login-field">
                <label className="login-label">Role</label>
                <select value={form.role} onChange={set('role')}>
                  {ROLE_HIERARCHY.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>

              {form.role !== ROLES.CEO && (
                <div className="login-field">
                  <label className="login-label">State</label>
                  <input className="login-input" list="um-states" value={form.state} onChange={set('state')} required={form.role === ROLES.STATE_SALES_HEAD} />
                  <datalist id="um-states">{allStates.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
              )}

              {(form.role === ROLES.DISTRICT_MANAGER || form.role === ROLES.SALES_OFFICER) && (
                <div className="login-field">
                  <label className="login-label">District / Area-City</label>
                  <input className="login-input" list="um-districts" value={form.district} onChange={set('district')} required={form.role === ROLES.DISTRICT_MANAGER} />
                  <datalist id="um-districts">{allDistricts.map((d) => <option key={d} value={d} />)}</datalist>
                </div>
              )}

              {form.role === ROLES.SALES_OFFICER && (
                <div className="login-field">
                  <label className="login-label">Sales Person (as named in Tally)</label>
                  <input className="login-input" list="um-salesmen" value={form.salesMan} onChange={pickSalesMan} required />
                  <datalist id="um-salesmen">{allSalesOfficers.map((o) => <option key={o.name} value={o.name} />)}</datalist>
                </div>
              )}

              <label className="login-remember-label">
                <input type="checkbox" className="login-remember-checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                <span className="login-remember-text">Active (can sign in)</span>
              </label>

              {formError && <div className="form-error">{formError}</div>}

              <div className="add-user-actions">
                <button type="button" className="add-user-cancel" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="add-user-submit" id="submit-new-user" disabled={saving}>
                  {saving ? 'Saving...' : isNew ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
