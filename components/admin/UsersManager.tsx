'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Shield, 
  Lock, 
  Unlock, 
  KeyRound, 
  Trash2, 
  Loader2, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  mobile: string;
  status: string;
  createdAt: string;
  roles: string[];
}

interface RoleOption {
  id: number;
  name: string;
  description: string | null;
}

export default function UsersManager() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [assigningRoles, setAssigningRoles] = useState(false);

  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Fetch initial users and roles
  const fetchUsersData = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (res.ok && json.success) {
        setUsersList(json.data.users);
        setRolesList(json.data.roles);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Filter computation
  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const matchesSearch = searchQuery.trim() === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mobile.includes(searchQuery);

      const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, searchQuery, roleFilter, statusFilter]);

  // Handle Toggle block/active status
  const handleToggleStatus = async (userObj: User) => {
    const nextStatus = userObj.status === 'active' ? 'blocked' : 'active';
    setActionUserId(userObj.id);

    try {
      const res = await fetch(`/api/admin/users/${userObj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          status: nextStatus,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUsersList(prev => 
          prev.map(u => (u.id === userObj.id ? { ...u, status: nextStatus } : u))
        );
      } else {
        alert(json.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Network error. Failed to update user status.');
    } finally {
      setActionUserId(null);
    }
  };

  // Handle Role Assignment submission
  const handleAssignRolesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setAssigningRoles(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'roles',
          roles: selectedRoles,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUsersList(prev => 
          prev.map(u => (u.id === editingUser.id ? { ...u, roles: selectedRoles } : u))
        );
        setEditingUser(null);
      } else {
        alert(json.message || 'Failed to assign roles');
      }
    } catch (err) {
      alert('Network error. Failed to update user roles.');
    } finally {
      setAssigningRoles(false);
    }
  };

  // Handle Password Reset submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 6) return;
    setChangingPassword(true);

    try {
      const res = await fetch(`/api/admin/users/${resettingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert('Password reset successfully in Supabase Auth!');
        setResettingUser(null);
        setNewPassword('');
      } else {
        alert(json.message || 'Failed to reset password');
      }
    } catch (err) {
      alert('Network error. Failed to reset password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userObj: User) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userObj.name}"? This action cannot be undone.`)) {
      return;
    }
    setActionUserId(userObj.id);

    try {
      const res = await fetch(`/api/admin/users/${userObj.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.code === 'BLOCKED_INSTEAD_OF_DELETE') {
          // Fallback triggers: blocked instead of deleted due to DB order history constraint
          alert(json.message);
          setUsersList(prev => 
            prev.map(u => (u.id === userObj.id ? { ...u, status: 'blocked', roles: [] } : u))
          );
        } else {
          alert('User successfully deleted!');
          setUsersList(prev => prev.filter(u => u.id !== userObj.id));
        }
      } else {
        alert(json.message || 'Failed to delete user');
      }
    } catch (err) {
      alert('Network error. Failed to delete user.');
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-550 flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-550" />
              Administrative User Management
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Manage internal staff roles, active/lock user logins, reset Supabase passwords, and delete accounts.
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800">
          <div className="relative col-span-2">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            >
              <option value="all">All Roles</option>
              {rolesList.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:text-zinc-200"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <span className="text-xs font-bold">Loading users data...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-550 font-medium">
              No users found matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850/50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 pl-6">User Name</th>
                    <th className="p-4">Email / Mobile</th>
                    <th className="p-4">Assigned Roles</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800 text-xs font-semibold text-zinc-750 dark:text-zinc-300">
                  {filteredUsers.map((user) => {
                    const isProcessing = actionUserId === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/10">
                        <td className="p-4 pl-6">
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-50 block">{user.name}</span>
                          <span className="text-[9px] text-zinc-400 block mt-0.5">Joined: {new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
                        </td>
                        <td className="p-4">
                          <span className="block">{user.email}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{user.mobile || '—'}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-400 text-[9px] font-medium">Customer</span>
                            ) : (
                              user.roles.map(role => (
                                <span 
                                  key={role} 
                                  className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wider dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                                >
                                  {role}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                              : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Role Editor */}
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setEditingUser(user);
                                setSelectedRoles(user.roles);
                              }}
                              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-750 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 cursor-pointer transition-all"
                              title="Assign Roles"
                            >
                              <Shield className="h-4 w-4" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setResettingUser(user);
                              }}
                              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-750 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 cursor-pointer transition-all"
                              title="Reset Password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>

                            {/* Lock/Unlock login */}
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleToggleStatus(user)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                user.status === 'active'
                                  ? 'border-zinc-200 hover:bg-rose-50 hover:text-rose-600 text-zinc-500 dark:border-zinc-750 dark:hover:bg-rose-950/10'
                                  : 'border-emerald-100 bg-emerald-50/10 text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={user.status === 'active' ? 'Lock Account' : 'Unlock Account'}
                            >
                              {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 rounded-xl border border-rose-100 hover:bg-rose-50 hover:text-rose-600 text-rose-500 cursor-pointer dark:border-rose-950/20 dark:hover:bg-rose-950/10 transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: ROLE BINDING ASSIGNER */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div 
              onClick={() => setEditingUser(null)} 
              className="fixed inset-0 cursor-default" 
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Shield className="h-4.5 w-4.5 text-emerald-500" /> Assign User Roles
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAssignRolesSubmit} className="space-y-5">
                <div className="text-xs space-y-1.5">
                  <p className="font-semibold text-zinc-400 uppercase">Target User</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">{editingUser.name} ({editingUser.email})</p>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Select Roles</span>
                  {rolesList.map(role => {
                    const isChecked = selectedRoles.includes(role.name);
                    return (
                      <label 
                        key={role.id} 
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          isChecked 
                            ? 'border-indigo-250 bg-indigo-50/5 dark:border-indigo-950/20' 
                            : 'border-zinc-100 hover:bg-zinc-55 dark:border-zinc-850 dark:hover:bg-zinc-850/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-0.5 rounded text-emerald-500 outline-none"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role.name]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role.name));
                            }
                          }}
                        />
                        <div className="text-xs">
                          <p className="font-extrabold text-zinc-800 dark:text-zinc-200">{role.name}</p>
                          {role.description && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{role.description}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={assigningRoles}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  {assigningRoles ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Role Bindings'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: PASSWORD RESET */}
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div 
              onClick={() => setResettingUser(null)} 
              className="fixed inset-0 cursor-default" 
            />
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-emerald-500" /> Reset Password
                </h3>
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="text-xs space-y-1.5">
                  <p className="font-semibold text-zinc-400 uppercase">Target User</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">{resettingUser.name} ({resettingUser.email})</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-450 uppercase tracking-wide">Enter New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword || newPassword.length < 6}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Password Reset'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
