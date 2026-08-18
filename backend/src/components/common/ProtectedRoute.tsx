import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute, getRoleDefinition, normalizeRole, CanonicalRole } from '../../utils/rbac';
import {
  Lock,
  ShieldCheck,
  ArrowLeft,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Briefcase,
  Building2,
  Crown,
  Shield,
  FileText,
  Calendar,
  CreditCard,
  FolderKanban,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  routePath: string;
}

interface QuickShortcut {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, routePath }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <>{children}</>;
  }

  const allowed = canAccessRoute(user.role, routePath);

  if (!allowed) {
    const userRoleDef = getRoleDefinition(user.role);
    const canonical = normalizeRole(user.role);

    // Get friendly route title for the restricted path
    const formatRouteName = (path: string): string => {
      const clean = path.replace('/', '').replace('-', ' ');
      if (!clean) return 'Requested Page';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    // Role-specific shortcut links
    const getRoleShortcuts = (role: CanonicalRole): QuickShortcut[] => {
      switch (role) {
        case 'ROLE_SUPER_ADMIN':
          return [
            { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Lead Management', path: '/leads', icon: FileText },
            { label: 'Client Engagements', path: '/projects', icon: FolderKanban },
            { label: 'Financial Reports', path: '/reports', icon: CreditCard },
          ];
        case 'ROLE_ADMIN':
          return [
            { label: 'Manager Dashboard', path: '/manager-dashboard', icon: LayoutDashboard },
            { label: 'Team Tasks', path: '/tasks', icon: CheckCircle2 },
            { label: 'Client Accounts', path: '/clients', icon: Building2 },
            { label: 'Proposals', path: '/proposals', icon: FileText },
          ];
        case 'ROLE_EMPLOYEE':
          return [
            { label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'My Assigned Tasks', path: '/tasks', icon: CheckCircle2 },
            { label: 'Active Projects', path: '/projects', icon: FolderKanban },
            { label: 'Schedule Meetings', path: '/meetings', icon: Calendar },
          ];
        case 'ROLE_CLIENT':
          return [
            { label: 'Client Portal', path: '/client-portal', icon: Building2 },
            { label: 'Project Progress', path: '/projects', icon: FolderKanban },
            { label: 'Billing & Invoices', path: '/invoices', icon: CreditCard },
            { label: 'Shared Documents', path: '/documents', icon: FileText },
          ];
      }
    };

    const shortcuts = getRoleShortcuts(canonical);
    const primaryHomePath = canonical === 'ROLE_CLIENT' ? '/client-portal' : '/dashboard';

    // Role icon component
    const RoleIcon =
      canonical === 'ROLE_SUPER_ADMIN'
        ? Crown
        : canonical === 'ROLE_ADMIN'
        ? Shield
        : canonical === 'ROLE_CLIENT'
        ? Building2
        : Briefcase;

    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
        <div className="max-w-2xl w-full bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center">
          {/* Subtle Ambient Soft Aura Background Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 right-10 w-64 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Badge & Soft Icon */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-b from-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-xl mb-4 group hover:scale-105 transition-transform duration-300">
              <Lock className="w-7 h-7 text-indigo-400" />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[11px] font-semibold tracking-wide mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Workspace Security Notice</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Access Restricted for Your Role
            </h2>

            <p className="text-sm text-slate-300 mt-2.5 max-w-lg leading-relaxed font-normal">
              The <span className="text-white font-semibold capitalize">{formatRouteName(routePath)}</span> section is configured for specific team responsibilities. Your current account privileges focus on your assigned workspace tools.
            </p>
          </div>

          {/* User Active Role Spotlight Card */}
          <div className="relative z-10 my-6 p-4 sm:p-5 bg-slate-950/80 border border-slate-800/90 rounded-2xl text-left shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {user.name}
                    <span className="text-[10px] text-slate-400 font-normal">({user.email})</span>
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${userRoleDef.bgBadge}`}>
                      <RoleIcon className="w-3 h-3" />
                      {userRoleDef.title}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400 font-medium">{user.department || 'Corporate Operations'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <p className="text-xs text-slate-300 leading-normal flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Your Current Scope:</strong> {userRoleDef.description}</span>
              </p>
            </div>
          </div>

          {/* Direct Navigation Action Buttons */}
          <div className="relative z-10 space-y-4">
            <button
              onClick={() => navigate(primaryHomePath)}
              className="w-full py-3 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Your Main Workspace</span>
            </button>

            {/* Quick Access Links */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left mb-2.5">
                Quick Access for Your Role
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {shortcuts.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.path}
                      onClick={() => navigate(sc.path)}
                      className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <Icon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors mb-1.5" />
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors truncate">
                          {sc.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Friendly Helpful Footer Note */}
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Need broader access? Please contact your firm administrator or workspace manager.</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
