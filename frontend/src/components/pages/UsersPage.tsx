import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { UserItem } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { Users, Plus, Edit2, Trash2, X, Loader2, ShieldCheck, Mail, Key } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch directory users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const userData: Partial<UserItem> = {
      fullName: String(formData.get('fullName')),
      email: String(formData.get('email')),
      role: (formData.get('role') as any) || 'ROLE_MANAGING_PARTNER',
      department: String(formData.get('department')),
      status: 'ACTIVE',
      twoFactorEnabled: true,
    };

    try {
      if (editingUser) {
        const updated = await apiService.updateUser(editingUser.id, userData);
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
        addToast('success', 'User Updated', `${userData.fullName} permissions updated.`);
      } else {
        const created = await apiService.createUser(userData);
        setUsers((prev) => [created, ...prev]);
        addToast('success', 'User Provisioned', `${userData.fullName} added to firm directory.`);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      addToast('error', 'Provisioning Failed', 'Could not save user to REST backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const targetUser = users.find((u) => u.id === deleteId);
    if (targetUser && (targetUser.role === 'ROLE_SUPER_ADMIN' || targetUser.role === 'ROLE_PARTNER' || targetUser.email.includes('jenkins'))) {
      addToast('error', 'Action Restricted', 'Cannot delete Super Admin (Company Owner) account!');
      setDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      await apiService.deleteUser(deleteId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteId));
      addToast('success', 'User Revoked', 'User access revoked.');
    } catch (err) {
      addToast('error', 'Action Failed', 'Failed to revoke user.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns: Column<UserItem>[] = [
    {
      key: 'fullName',
      header: 'Partner / User Name',
      sortable: true,
      render: (u) => (
        <div>
          <span className="font-bold text-white block text-xs">{u.fullName || u.name}</span>
          <span className="text-[11px] text-slate-400 block">{u.department || 'Executive Advisory'}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email Address',
      sortable: true,
      render: (u) => (
        <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
          <Mail className="w-3 h-3" /> {u.email}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      sortable: true,
      render: (u) => (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {u.role ? u.role.replace('ROLE_', '') : 'PARTNER'}
        </span>
      ),
    },
    {
      key: 'twoFactorEnabled',
      header: '2FA Security',
      render: () => (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
          <ShieldCheck className="w-3 h-3" /> ENABLED
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (u) => (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          {u.status}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-400" /> Firm Partner & Staff Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role-based user management, partner credentials, 2FA enforcement, and access logs.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Provision User
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Search users by name, email, role..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchUsers}
        onAddNew={() => {
          setEditingUser(null);
          setIsModalOpen(true);
        }}
        addNewLabel="Provision User"
        actions={(user) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setEditingUser(user);
                setIsModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteId(user.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingUser ? 'Edit User Credentials' : 'Provision New Firm User'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  defaultValue={editingUser?.fullName || editingUser?.name}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={editingUser?.email}
                  placeholder="m.vance@gamcs.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    System Role
                  </label>
                  <select
                    name="role"
                    defaultValue={editingUser?.role || 'ROLE_MANAGING_PARTNER'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ROLE_MANAGING_PARTNER">Managing Partner</option>
                    <option value="ROLE_SENIOR_PARTNER">Senior Partner</option>
                    <option value="ROLE_ASSOCIATE">Senior Associate</option>
                    <option value="ROLE_AUDITOR">External Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Practice Group
                  </label>
                  <input
                    type="text"
                    name="department"
                    defaultValue={editingUser?.department || 'Valuation & Advisory'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Save Changes' : 'Provision User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Revoke Access"
        message="Are you sure you want to revoke this user's corporate access credentials?"
        confirmText="Revoke User"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
