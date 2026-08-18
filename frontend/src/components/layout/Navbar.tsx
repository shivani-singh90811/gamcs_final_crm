import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { canAccessRoute } from '../../utils/rbac';
import {
  Search, Plus, FileText, Calendar, FileSpreadsheet, Moon, Sun, LogOut,
  Sparkles, LayoutDashboard, Flame, FileCheck, Clock
} from 'lucide-react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { ExcelImportModal } from '../common/ExcelImportModal';
import { FollowUpModal } from '../common/FollowUpModal';
import { apiService } from '../../services/api';

interface NavbarProps {
  onOpenAddLeadModal?: () => void;
  onOpenProposalModal?: () => void;
  onSearchChange?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddLeadModal, onOpenProposalModal, onSearchChange }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [leadCount, setLeadCount] = useState<number>(2);

  // Modal triggers
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const leads = await apiService.getLeads();
        setLeadCount(leads.length);
      } catch (err) {
        setLeadCount(2);
      }
    };
    loadCounts();
  }, [location.pathname]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleAddLeadClick = () => {
    if (onOpenAddLeadModal) {
      onOpenAddLeadModal();
    } else {
      navigate('/leads?action=add');
    }
  };

  const handleProposalClick = () => {
    if (onOpenProposalModal) {
      onOpenProposalModal();
    } else {
      navigate('/proposals');
    }
  };

  const subNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads Pipeline', badge: leadCount, icon: Flame },
    { to: '/proposals', label: 'Proposals', icon: FileCheck },
    { to: '/tasks', label: 'Follow-ups', icon: Calendar },
    { to: '/timeline', label: 'Activity Logs', icon: Clock },
  ];

  return (
    <>
      <header className="bg-[#0b0f19] border-b border-slate-800/90 text-slate-100 shrink-0 z-30 sticky top-0 shadow-2xl">
        {/* Main Navbar Top Row */}
        <div className="h-16 px-6 flex items-center justify-between gap-4">
          {/* Left Brand Badge */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-950/60 group-hover:scale-105 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                    GAMCS CRM
                  </span>
                  <span className="bg-indigo-950 border border-indigo-800/80 text-indigo-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                  Practice Management Platform
                </p>
              </div>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search leads, companies, emails, tags"
                className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-slate-800 bg-[#121827] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Right Header Quick Buttons */}
          <div className="flex items-center gap-2.5">
            {/* + Add Lead Button */}
            {canAccessRoute(user?.role, '/leads') && (
              <button
                onClick={handleAddLeadClick}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>
            )}

            {/* Proposal Quick Button */}
            {canAccessRoute(user?.role, '/proposals') && (
              <button
                onClick={handleProposalClick}
                className="px-3 py-1.5 bg-[#121827] hover:bg-[#1a2236] text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Proposal</span>
              </button>
            )}

            {/* Follow-up Quick Button */}
            {canAccessRoute(user?.role, '/tasks') && (
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="px-3 py-1.5 bg-[#121827] hover:bg-[#1a2236] text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Follow-up</span>
              </button>
            )}

            {/* Excel / Import Button */}
            {canAccessRoute(user?.role, '/leads') && (
              <button
                onClick={() => setShowExcelModal(true)}
                className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-800/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel / Import</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-800"
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* User Profile Info */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'SS'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {user?.name || 'Managing Partner'}
                </p>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/90 px-1.5 py-0.2 rounded border border-amber-800/80 inline-block mt-0.5">
                  {user?.role === 'ROLE_SUPER_ADMIN' || user?.role === 'ROLE_PARTNER' ? '👑 Super Admin' :
                   user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_SENIOR_CONSULTANT' ? '🛡️ Admin/Manager' :
                   user?.role === 'ROLE_CLIENT' || user?.role === 'ROLE_CLIENT_PORTAL' ? '🏢 Client' : '💼 Employee'}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Sub-Navigation Bar */}
        <div className="px-6 h-11 bg-[#0d1220] border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {subNavItems.filter((item) => canAccessRoute(user?.role, item.to)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600/90 text-white shadow-md border border-indigo-500/40'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="bg-indigo-950 text-indigo-300 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full border border-indigo-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Global Excel Import Modal */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onImportSuccess={() => navigate('/leads')}
      />

      {/* Global Follow-up Task Modal */}
      <FollowUpModal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onTaskCreated={() => navigate('/tasks')}
      />
    </>
  );
};
