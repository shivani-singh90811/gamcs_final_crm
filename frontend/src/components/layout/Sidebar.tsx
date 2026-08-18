import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute, getRoleDefinition } from '../../utils/rbac';
import {
  LayoutDashboard, Flame, UserCheck, Building2, Calendar, Briefcase, CheckSquare,
  FileText, DollarSign, BarChart3, Users, Shield, Settings, Bell, Clock, FileCheck, Database,
  Crown, Lock, HelpCircle
} from 'lucide-react';
import { getStoredConfig } from '../../services/api';

interface SidebarProps {
  onOpenApiConfig?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenApiConfig }) => {
  const { user } = useAuth();
  const config = getStoredConfig();
  const roleDef = getRoleDefinition(user?.role);

  const rawNavSections = [
    {
      title: 'CORE OPERATIONS',
      items: [
        { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { to: '/manager-dashboard', label: 'Manager Dashboard', icon: Shield },
        { to: '/leads', label: 'Leads & Pipeline', icon: Flame },
        { to: '/contacts', label: 'Contacts Directory', icon: UserCheck },
        { to: '/clients', label: 'Clients Portfolio', icon: Building2 },
        { to: '/meetings', label: 'Meetings Schedule', icon: Calendar },
      ],
    },
    {
      title: 'DELIVERY & PROJECTS',
      items: [
        { to: '/projects', label: 'Projects & Engagements', icon: Briefcase },
        { to: '/tasks', label: 'Tasks Kanban', icon: CheckSquare },
        { to: '/proposals', label: 'Proposal Builder', icon: FileCheck },
      ],
    },
    {
      title: 'FINANCE & VAULT',
      items: [
        { to: '/invoices', label: 'Invoices & Billing', icon: DollarSign },
        { to: '/documents', label: 'Document Vault', icon: FileText },
        { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'GOVERNANCE & ADMIN',
      items: [
        { to: '/users', label: 'Users Directory', icon: Users },
        { to: '/roles', label: 'Roles & Access Matrix', icon: Shield },
        { to: '/timeline', label: 'Activity Audit Trail', icon: Clock },
        { to: '/notifications', label: 'Notifications Center', icon: Bell },
        { to: '/settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  // Dedicated section for Client Portal if Client role or accessible
  const clientSection = {
    title: 'CLIENT PORTAL',
    items: [
      { to: '/client-portal', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/projects', label: 'Projects', icon: Briefcase },
      { to: '/invoices', label: 'Invoices', icon: DollarSign },
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/meetings', label: 'Meetings', icon: Calendar },
      { to: '/contacts', label: 'Support', icon: HelpCircle },
    ],
  };

  // Custom labels for Employee and Client roles
  const getLabelForRole = (to: string, defaultLabel: string) => {
    if (roleDef.code === 'ROLE_CLIENT') {
      switch (to) {
        case '/client-portal':
          return 'Dashboard';
        case '/projects':
          return 'Projects';
        case '/invoices':
          return 'Invoices';
        case '/documents':
          return 'Documents';
        case '/meetings':
          return 'Meetings';
        case '/contacts':
          return 'Support';
        default:
          return defaultLabel;
      }
    }
    if (roleDef.code === 'ROLE_EMPLOYEE') {
      switch (to) {
        case '/dashboard':
          return 'Dashboard';
        case '/tasks':
          return "Today's Tasks";
        case '/leads':
          return 'My Leads';
        case '/projects':
          return 'My Projects';
        case '/meetings':
          return 'Meetings';
        case '/documents':
          return 'Documents';
        case '/notifications':
          return 'Notifications';
        case '/proposals':
          return 'Generate Proposal';
        default:
          return defaultLabel;
      }
    }
    return defaultLabel;
  };

  // Filter sections based on RBAC route authorization
  const navSections = (roleDef.code === 'ROLE_CLIENT' ? [clientSection] : rawNavSections)
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => canAccessRoute(user?.role, item.to))
        .map((item) => ({
          ...item,
          label: getLabelForRole(item.to, item.label),
        })),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="w-64 bg-[#0b0f19] flex flex-col shrink-0 border-r border-slate-800/80 h-screen select-none z-20">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80 bg-[#0e1322]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-950/50 text-xl tracking-tight">
            G
          </div>
          <div>
            <span className="text-white font-extrabold text-base tracking-tight block leading-none">
              GAMCS CRM
            </span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mt-1">
              Practice Management
            </span>
          </div>
        </div>
      </div>

      {/* Active Role Indicator Badge */}
      <div className="px-4 pt-3 pb-1">
        <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${roleDef.bgBadge}`}>
          <div className="w-6 h-6 rounded-lg bg-slate-900/60 flex items-center justify-center shrink-0">
            {roleDef.code === 'ROLE_SUPER_ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-300" />}
            {roleDef.code === 'ROLE_ADMIN' && <Shield className="w-3.5 h-3.5 text-purple-300" />}
            {roleDef.code === 'ROLE_EMPLOYEE' && <Briefcase className="w-3.5 h-3.5 text-emerald-300" />}
            {roleDef.code === 'ROLE_CLIENT' && <Building2 className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-wider block leading-none text-slate-300">
              Active Role Scope
            </span>
            <span className="text-xs font-bold truncate block mt-0.5 text-white">
              {roleDef.badge}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {section.title}
            </h3>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-950/50 backdrop-blur-sm border border-indigo-500/30 font-bold'
                        : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* REST API Node Status Widget */}
      <div className="p-3 bg-[#0e1322] m-3 rounded-2xl border border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          <span>SPRING BOOT REST</span>
          {onOpenApiConfig && (
            <button
              onClick={onOpenApiConfig}
              className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Configure REST API Target"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-3 h-3 text-indigo-400" /> Rest API
            </span>
            <span className="font-mono text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
              CONNECTED
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
