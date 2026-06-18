import { useState } from 'react';
import { useAuth, ROLE_LABELS, CAN_CREATE_ROLE } from '../context/AuthContext';
import { allDistricts, allSalesOfficers } from '../data/salesData';
import { UserPlus, Trash2 } from 'lucide-react';
import './ManageUsers.css';

export default function ManageUsers() {
  const { currentUser, getManagedUsers, addUser, deleteUser, canManageUsers } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', scope: '' });

  const managedUsers = getManagedUsers();
  const creatableRole = CAN_CREATE_ROLE[currentUser?.role];

  if (!canManageUsers) {
    return (
      <div className="manage-users-page">
        <h2 className="manage-users-title">Manage Users</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to manage users.</p>
      </div>
    );
  }

  const getScopeOptions = () => {
    if (creatableRole === 'district_manager') {
      return allDistricts.map(d => ({ value: d, label: d }));
    }
    if (creatableRole === 'sales_officer') {
      const districtOfficers = allSalesOfficers.filter(o => o.district === currentUser.district);
      return districtOfficers.map(o => ({ value: o.name, label: o.name }));
    }
    return [{ value: 'Madhya Pradesh', label: 'Madhya Pradesh' }];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name || !form.email || !form.password || !form.scope) {
      setFormError('All fields are required');
      return;
    }

    const newUser = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: creatableRole,
      scope: form.scope,
      state: currentUser.state || 'Madhya Pradesh',
      district: creatableRole === 'district_manager' ? form.scope : (currentUser.district || null),
      salesMan: creatableRole === 'sales_officer' ? form.scope : null,
    };

    const result = addUser(newUser);
    if (result.success) {
      setShowForm(false);
      setForm({ name: '', email: '', password: '', scope: '' });
    } else {
      setFormError(result.error);
    }
  };

  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      deleteUser(userId);
    }
  };

  return (
    <div className="manage-users-page">
      <div className="manage-users-header">
        <div>
          <h2 className="manage-users-title">Manage Users</h2>
          <p className="manage-users-subtitle">
            Create and manage {ROLE_LABELS[creatableRole]} accounts
          </p>
        </div>
        <button className="add-user-btn" onClick={() => setShowForm(true)} id="add-user-btn">
          <UserPlus size={16} />
          Add {ROLE_LABELS[creatableRole]}
        </button>
      </div>

      {/* User Cards */}
      <div className="users-grid">
        {managedUsers.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-card-top">
              <div className="user-card-avatar">
                {user.name.charAt(0)}
              </div>
              <button className="user-card-delete" onClick={() => handleDelete(user.id)} title="Remove user">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="user-card-name">{user.name}</div>
            <div className="user-card-email">{user.email}</div>
            <div className="user-card-meta">
              <span className="user-card-badge role">{ROLE_LABELS[user.role]}</span>
              <span className="user-card-badge scope">{user.scope}</span>
            </div>
          </div>
        ))}

        {managedUsers.length === 0 && (
          <div style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
            No {ROLE_LABELS[creatableRole]} accounts yet. Click "Add" to create one.
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="add-user-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="add-user-modal">
            <h3 className="add-user-modal-title">Add {ROLE_LABELS[creatableRole]}</h3>
            <form className="add-user-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label">Email / Username</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="e.g. rajesh@wallnut.in"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label">Password</label>
                <input
                  className="login-input"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label">
                  {creatableRole === 'state_sales_head' ? 'State' :
                   creatableRole === 'district_manager' ? 'District / Area-City' :
                   'Sales Officer Identity'}
                </label>
                <select
                  value={form.scope}
                  onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))}
                  required
                >
                  <option value="">Select scope...</option>
                  {getScopeOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="add-user-actions">
                <button type="button" className="add-user-cancel" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="add-user-submit" id="submit-new-user">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
