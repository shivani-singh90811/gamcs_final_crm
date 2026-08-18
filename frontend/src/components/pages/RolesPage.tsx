import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFINITIONS, getRoleDefinition, CanonicalRole } from '../../utils/rbac';
import { apiService } from '../../services/api';
import { User } from '../../types';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  Shield, Check, X, Crown, Briefcase, Building2, Lock, Users,
  Database, Settings, FileText, DollarSign, BarChart3, Clock, AlertTriangle
} from 'lucide-react';

interface PermissionRow {
  key: string;
  module: string;
  action: string;
  superAdmin: boolean;
  admin: boolean;
  employee: boolean;
  client: boolean;
}

export const RolesPage: React.FC = () => {
  const { user } = useAuth();
  const currentRoleDef = getRoleDefinition(user?.role);
  const isSuperAdmin = currentRoleDef.code === 'ROLE_SUPER_ADMIN';

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiService.getUsers();
        setUsersList(data);
      } catch (err) {
        console.error('Failed to load users for roles page:', err);
      }
    };
    fetchUsers();
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // State for matrix permissions
  const [matrix, setMatrix] = useState<PermissionRow[]>([
    { key: 'LOGIN_SECURELY', module: 'Authentication', action: 'Login securely with JWT credentials', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'VIEW_OWN_PROJECTS', module: 'Projects & Progress', action: 'View only their own company projects', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'VIEW_INVOICES', module: 'Invoices & Billing', action: 'View retainer invoices & payment status', superAdmin: true, admin: true, employee: false, client: true },
    { key: 'VIEW_DOCUMENTS', module: 'Document Vault', action: 'View & download uploaded vault documents', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'VIEW_PROJECT_PROGRESS', module: 'Projects & Progress', action: 'View milestone completion progress', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'DOWNLOAD_REPORTS', module: 'Financial Analytics', action: 'Download valuation & tax advisory reports', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'SEND_MESSAGES', module: 'Client Advisory Hub', action: 'Send inquiry messages & request CFO calls', superAdmin: true, admin: true, employee: true, client: true },
    { key: 'VIEW_INTERNAL_TASKS', module: 'Task Management', action: 'View internal staff tasks & Kanban board', superAdmin: true, admin: true, employee: true, client: false },
    { key: 'VIEW_EMPLOYEE_INFO', module: 'Users Directory', action: 'View employee directory & internal profiles', superAdmin: true, admin: true, employee: true, client: false },
    { key: 'VIEW_OTHER_CLIENT_REPORTS', module: 'Financial Analytics', action: 'View financial reports of other clients', superAdmin: true, admin: true, employee: false, client: false },
    { key: 'CHANGE_COMPANY_SETTINGS', module: 'Governance', action: 'Configure system & company settings', superAdmin: true, admin: false, employee: false, client: false },
  ]);

  const togglePermission = (rowIndex: number, roleKey: 'superAdmin' | 'admin' | 'employee' | 'client') => {
    if (!isSuperAdmin) {
      addToast('error', 'Super Admin Privilege', 'Permission modifications are reserved for Super Admin accounts.');
      return;
    }
    setMatrix((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [roleKey]: !updated[rowIndex][roleKey] };
      return updated;
    });
    addToast('success', 'Permissions Updated', 'Role access configuration updated successfully.');
  };

  const roleCardList: CanonicalRole[] = ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_CLIENT'];

  // Dynamically map users list by role code
  const roleUsersMap: Record<CanonicalRole, { name: string; title: string; email: string; avatar: string }[]> = {
    ROLE_SUPER_ADMIN: usersList
      .filter((u) => u.role === 'ROLE_SUPER_ADMIN')
      .map((u) => ({ name: u.name, title: u.title || 'Managing Partner', email: u.email, avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' })),
    ROLE_ADMIN: usersList
      .filter((u) => u.role === 'ROLE_ADMIN' || u.role === 'ADMIN')
      .map((u) => ({ name: u.name, title: u.title || 'Senior Partner', email: u.email, avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' })),
    ROLE_EMPLOYEE: usersList
      .filter((u) => u.role === 'ROLE_EMPLOYEE' || u.role === 'EMPLOYEE' || u.role === 'ROLE_SENIOR_CONSULTANT')
      .map((u) => ({ name: u.name, title: u.title || 'Lead Advisor', email: u.email, avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' })),
    ROLE_CLIENT: usersList
      .filter((u) => u.role === 'ROLE_CLIENT' || u.role === 'CLIENT')
      .map((u) => ({ name: u.name, title: u.title || 'Client Executive', email: u.email, avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' })),
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      <ToastNotification toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-full text-[10px] font-black uppercase tracking-widest">
              Workspace Access Control
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" /> Enterprise Roles & Permissions Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Overview of access permissions across the four primary organization roles: Super Admin, Manager, Employee, and Client.
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="p-3 bg-indigo-950/50 border border-indigo-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-300 font-semibold">
            <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>View Mode. Permission modifications require a Super Admin account.</span>
          </div>
        )}
      </div>

      {/* 4 Enterprise Roles Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {roleCardList.map((roleKey) => {
          const def = ROLE_DEFINITIONS[roleKey];
          const usersInRole = roleUsersMap[roleKey] || [];

          return (
            <div
              key={roleKey}
              className={`bg-[#0f172a] border rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden transition-all ${
                currentRoleDef.code === roleKey ? 'border-indigo-500 shadow-indigo-950/50' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${def.bgBadge}`}>
                    {roleKey === 'ROLE_SUPER_ADMIN' && <Crown className="w-5 h-5 text-amber-300" />}
                    {roleKey === 'ROLE_ADMIN' && <Shield className="w-5 h-5 text-purple-300" />}
                    {roleKey === 'ROLE_EMPLOYEE' && <Briefcase className="w-5 h-5 text-emerald-300" />}
                    {roleKey === 'ROLE_CLIENT' && <Building2 className="w-5 h-5 text-amber-400" />}
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${def.bgBadge}`}>
                    {def.badge}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-white mt-3 tracking-tight">{def.title}</h3>
                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">{def.subtitle}</p>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-slate-800/80 pt-3">
                  {def.description}
                </p>
              </div>

              {/* Assigned Representative User */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Assigned User Account
                </span>
                {usersInRole.map((u, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                    <div className="overflow-hidden text-left">
                      <p className="text-xs font-bold text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Permission Matrix Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" /> Enterprise Role Authority Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Granular capabilities comparing permission policies across all 4 system roles.
            </p>
          </div>
          {isSuperAdmin && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
              Click checkboxes to toggle permission policy
            </span>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 bg-slate-950/50 rounded-tl-xl">Module</th>
                <th className="py-3 px-4 bg-slate-950/50">Action Capability</th>
                <th className="py-3 px-4 bg-slate-950/50 text-center">
                  <span className="text-indigo-400 block font-black">👑 Super Admin</span>
                  <span className="text-[9px] text-slate-500 font-normal">Company Owner</span>
                </th>
                <th className="py-3 px-4 bg-slate-950/50 text-center">
                  <span className="text-purple-400 block font-black">🛡️ Admin / Manager</span>
                  <span className="text-[9px] text-slate-500 font-normal">Senior Partner</span>
                </th>
                <th className="py-3 px-4 bg-slate-950/50 text-center">
                  <span className="text-emerald-400 block font-black">💼 Employee</span>
                  <span className="text-[9px] text-slate-500 font-normal">Analyst / Consultant</span>
                </th>
                <th className="py-3 px-4 bg-slate-950/50 text-center rounded-tr-xl">
                  <span className="text-amber-400 block font-black">🏢 Client</span>
                  <span className="text-[9px] text-slate-500 font-normal">CFO Client Portal</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-300">{row.module}</td>
                  <td className="py-3 px-4 text-slate-300 font-medium">{row.action}</td>

                  {/* Super Admin */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePermission(idx, 'superAdmin')}
                      disabled={!isSuperAdmin}
                      className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer bg-emerald-950/80 border border-emerald-800 text-emerald-400"
                    >
                      {row.superAdmin ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-rose-500" />}
                    </button>
                  </td>

                  {/* Admin / Manager */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePermission(idx, 'admin')}
                      disabled={!isSuperAdmin}
                      className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        row.admin
                          ? 'bg-purple-950/80 border border-purple-800 text-purple-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      {row.admin ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-600" />}
                    </button>
                  </td>

                  {/* Employee */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePermission(idx, 'employee')}
                      disabled={!isSuperAdmin}
                      className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        row.employee
                          ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      {row.employee ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-600" />}
                    </button>
                  </td>

                  {/* Client */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePermission(idx, 'client')}
                      disabled={!isSuperAdmin}
                      className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        row.client
                          ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      {row.client ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-600" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
