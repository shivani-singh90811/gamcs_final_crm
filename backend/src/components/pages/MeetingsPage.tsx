import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Meeting, MeetingType, MeetingStatus, ParticipantItem, ActionItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X,
  Loader2,
  Clock,
  MapPin,
  Users,
  Video,
  User,
  Sparkles,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit3,
  UserPlus,
  Check,
  Search,
  Briefcase,
  List,
  Grid,
  ShieldCheck,
  AlertCircle,
  Download,
  Share2,
  ArrowRight
} from 'lucide-react';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';
  const isClient = canonicalRole === 'ROLE_CLIENT';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // View States: 'list' | 'calendar' | 'history'
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'history'>('list');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Calendar State (Default August 2026)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // Aug 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Selected Meeting Details Drawer / Modal
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'participants' | 'summary' | 'actions'>('summary');

  // Notes state inside drawer
  const [editingNotes, setEditingNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // AI Summary Generation state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Participant Form state
  const [newPartName, setNewPartName] = useState('');
  const [newPartEmail, setNewPartEmail] = useState('');
  const [newPartRole, setNewPartRole] = useState<'ATTENDEE' | 'CLIENT' | 'GUEST' | 'HOST'>('ATTENDEE');

  // Action Item Form state
  const [newActionTask, setNewActionTask] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  // Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const fetchMeetings = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getMeetings();
      setMeetings(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'API Error', 'Failed to fetch executive meetings schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Update notes state when selected meeting changes
  useEffect(() => {
    if (selectedMeeting) {
      setEditingNotes(selectedMeeting.meetingNotes || selectedMeeting.agenda || '');
    }
  }, [selectedMeeting]);

  // Create Meeting Submit
  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const title = String(formData.get('title'));
    const clientName = String(formData.get('clientName'));
    const date = String(formData.get('date'));
    const time = String(formData.get('time'));
    const location = String(formData.get('location'));
    const agenda = String(formData.get('agenda'));
    const type = String(formData.get('type')) as MeetingType;

    const initialHostName = user?.name || 'Sarah Jenkins';
    const initialHostEmail = user?.email || 's.jenkins@archicorp.com';

    const meetingData: Partial<Meeting> = {
      title,
      clientName,
      date,
      time,
      location,
      agenda,
      type: type || 'STRATEGY_REVIEW',
      status: 'SCHEDULED',
      attendees: [initialHostName, clientName],
      participantDetails: [
        { name: initialHostName, email: initialHostEmail, role: 'HOST', status: 'ATTENDING' },
        { name: clientName, email: `contact@${clientName.toLowerCase().replace(/[^a-z]/g, '')}.com`, role: 'CLIENT', status: 'PENDING' }
      ],
      meetingNotes: agenda,
      actionItems: [],
    };

    try {
      const created = await apiService.createMeeting(meetingData);
      setMeetings((prev) => [created, ...prev]);
      addToast('success', 'Meeting Scheduled', `Advisory call "${title}" added to calendar.`);
      setIsModalOpen(false);
    } catch (err) {
      addToast('error', 'Schedule Failed', 'Could not save meeting to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Notes to Backend
  const handleSaveNotes = async () => {
    if (!selectedMeeting) return;
    setIsSavingNotes(true);
    try {
      const updated = await apiService.updateMeeting(selectedMeeting.id, {
        meetingNotes: editingNotes,
      });
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMeeting(updated);
      addToast('success', 'Notes Saved', 'Meeting notes updated successfully.');
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save meeting notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Generate AI Summary
  const handleGenerateAiSummary = async () => {
    if (!selectedMeeting) return;
    setIsGeneratingAi(true);
    try {
      const result = await apiService.generateMeetingAiSummary(selectedMeeting.id, editingNotes);
      setMeetings((prev) => prev.map((m) => (m.id === selectedMeeting.id ? result.meeting : m)));
      setSelectedMeeting(result.meeting);
      setActiveTab('summary');
      addToast('success', 'AI Summary Generated', 'Executive insights & action items updated.');
    } catch (err) {
      addToast('error', 'AI Generation Failed', 'Could not generate meeting summary.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !newPartName || !newPartEmail) return;

    const newParticipant: ParticipantItem = {
      id: `p-${Date.now()}`,
      name: newPartName,
      email: newPartEmail,
      role: newPartRole,
      status: 'ATTENDING',
    };

    const updatedParticipants = [...(selectedMeeting.participantDetails || []), newParticipant];
    const updatedAttendees = Array.from(new Set([...(selectedMeeting.attendees || []), newPartName]));

    try {
      const updated = await apiService.updateMeeting(selectedMeeting.id, {
        participantDetails: updatedParticipants,
        attendees: updatedAttendees,
      });
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMeeting(updated);
      setNewPartName('');
      setNewPartEmail('');
      addToast('success', 'Participant Added', `${newPartName} invited to meeting.`);
    } catch (err) {
      addToast('error', 'Action Failed', 'Failed to add participant.');
    }
  };

  // Add Action Item
  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !newActionTask) return;

    const newAction: ActionItem = {
      id: `ai-${Date.now()}`,
      task: newActionTask,
      assignee: newActionAssignee || user?.name || 'Staff Analyst',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      completed: false,
    };

    const updatedActionItems = [...(selectedMeeting.actionItems || []), newAction];

    try {
      const updated = await apiService.updateMeeting(selectedMeeting.id, {
        actionItems: updatedActionItems,
      });
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMeeting(updated);
      setNewActionTask('');
      setNewActionAssignee('');
      addToast('success', 'Action Item Added', 'Task logged for execution.');
    } catch (err) {
      addToast('error', 'Action Failed', 'Could not log action item.');
    }
  };

  // Toggle Action Item Completion
  const handleToggleAction = async (actionId: string) => {
    if (!selectedMeeting) return;
    const updatedActionItems = (selectedMeeting.actionItems || []).map((ai) =>
      ai.id === actionId ? { ...ai, completed: !ai.completed } : ai
    );

    try {
      const updated = await apiService.updateMeeting(selectedMeeting.id, {
        actionItems: updatedActionItems,
      });
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMeeting(updated);
    } catch (err) {
      addToast('error', 'Update Failed', 'Failed to update action item status.');
    }
  };

  // Mark Meeting as Completed
  const handleCompleteMeeting = async (mtgId: string) => {
    try {
      const updated = await apiService.updateMeeting(mtgId, { status: 'COMPLETED' });
      setMeetings((prev) => prev.map((m) => (m.id === mtgId ? updated : m)));
      if (selectedMeeting?.id === mtgId) setSelectedMeeting(updated);
      addToast('success', 'Meeting Completed', 'Session archived to meeting history.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not change meeting status.');
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isEmployee || isClient) {
      addToast('error', 'Action Restricted', 'You do not have permission to delete or cancel scheduled meetings.');
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteMeeting(deleteId);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteId));
      if (selectedMeeting?.id === deleteId) setSelectedMeeting(null);
      addToast('success', 'Meeting Cancelled', 'Meeting removed from executive calendar.');
    } catch (err) {
      addToast('error', 'Action Failed', 'Failed to cancel meeting.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Filter RBAC Scope
  const scopeMeetings = isClient
    ? meetings.filter((m) => {
        const client = (m.clientName || '').toLowerCase();
        const title = (m.title || '').toLowerCase();
        return client.includes('starlight') || client.includes('bio') || client.includes('vance') || title.includes('starlight');
      })
    : isEmployee
    ? meetings.filter((m) => {
        const title = m.title.toLowerCase();
        const client = m.clientName.toLowerCase();
        const attendees = (m.attendees || []).join(' ').toLowerCase();
        const userName = (user?.name || 'robert').toLowerCase();
        return (
          title.includes('analyst') ||
          title.includes('valuat') ||
          attendees.includes(userName) ||
          attendees.includes('robert') ||
          client.includes('meridian') ||
          client.includes('starlight')
        );
      })
    : meetings;

  // Filter Search & Category
  const filteredMeetings = scopeMeetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.agenda.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'ALL' || m.type === selectedTypeFilter;
    const matchesViewMode =
      viewMode === 'history'
        ? m.status === 'COMPLETED' || (m.date && m.date < '2026-08-01')
        : viewMode === 'list'
        ? m.status === 'SCHEDULED' || m.status === 'COMPLETED'
        : true;

    const matchesSelectedDate = selectedCalendarDate ? (m.date || m.meetingDate) === selectedCalendarDate : true;

    return matchesSearch && matchesType && matchesViewMode && matchesSelectedDate;
  });

  // Calendar Days Calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDayString = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in text-slate-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-emerald-400" /> Executive Calendar & Meeting Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Board advisory calls, due diligence syncs, meeting notes, participants management, and AI summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggles */}
          <div className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedCalendarDate(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Upcoming List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'calendar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Calendar View
            </button>
            <button
              onClick={() => {
                setViewMode('history');
                setSelectedCalendarDate(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Meeting History
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* RBAC SCOPE BANNER */}
      {isEmployee && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Employee Scope: Showing meetings assigned to you ({scopeMeetings.length} advisory sessions).
            </span>
          </div>
          <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            RBAC Enforcement
          </span>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meeting, client, or notes..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {selectedCalendarDate && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-bold">
              <span>Filter Date: {selectedCalendarDate}</span>
              <button onClick={() => setSelectedCalendarDate(null)} className="hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Meeting Types</option>
            <option value="STRATEGY_REVIEW">Strategy Review</option>
            <option value="BOARD_PRESENTATION">Board Presentation</option>
            <option value="BOARD_ADVISORY">Board Advisory</option>
            <option value="DUE_DILIGENCE">Due Diligence</option>
            <option value="TAX_PLANNING">Tax Planning</option>
            <option value="PITCH_REVIEW">Pitch Review</option>
          </select>
        </div>
      </div>

      {/* MAIN VIEW MODE DISPLAY */}
      {viewMode === 'calendar' ? (
        /* CALENDAR GRID VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                {monthName} {year}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                ({scopeMeetings.length} Total Meetings Scheduled)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(2026, 7, 1))}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Day Name Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Date Cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty Offset Days */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-28 bg-slate-950/40 border border-slate-800/30 rounded-xl opacity-40" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = formatDayString(dayNum);
              const dayMeetings = scopeMeetings.filter((m) => (m.date || m.meetingDate) === dateStr);
              const isSelected = selectedCalendarDate === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    if (dayMeetings.length > 0) {
                      setSelectedCalendarDate(dateStr);
                      setViewMode('list');
                    } else {
                      setIsModalOpen(true);
                    }
                  }}
                  className={`h-28 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-lg shadow-emerald-950/50'
                      : dayMeetings.length > 0
                      ? 'bg-slate-950/90 border-slate-700/80 hover:border-emerald-500/80'
                      : 'bg-slate-950/50 border-slate-800/60 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        dayMeetings.length > 0 ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-800">
                        {dayMeetings.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <div
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMeeting(m);
                        }}
                        className="px-1.5 py-1 bg-emerald-900/60 border border-emerald-800/60 rounded-md text-[10px] font-bold text-white truncate hover:bg-emerald-800"
                        title={m.title}
                      >
                        {m.time ? `${m.time.split(' ')[0]} ` : ''}
                        {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block px-1">
                        +{dayMeetings.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST / HISTORY VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT LIST COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-semibold">Loading executive meeting records...</p>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">No meetings found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting search parameters or schedule a new call.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Schedule Advisory Meeting
                </button>
              </div>
            ) : (
              filteredMeetings.map((mtg) => {
                const isSelected = selectedMeeting?.id === mtg.id;
                return (
                  <div
                    key={mtg.id}
                    onClick={() => setSelectedMeeting(mtg)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider border border-slate-700">
                            {mtg.type ? mtg.type.replace('_', ' ') : 'STRATEGY'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              mtg.status === 'COMPLETED'
                                ? 'bg-blue-950/80 text-blue-400 border-blue-800'
                                : mtg.status === 'CANCELLED'
                                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            }`}
                          >
                            {mtg.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">{mtg.title}</h3>
                        <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" /> {mtg.clientName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-white flex items-center gap-1 justify-end">
                          <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{mtg.date || mtg.meetingDate || '2026-08-05'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end mt-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{mtg.time || mtg.startTime || '10:00 AM - 11:30 AM'}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="font-bold text-slate-300">Agenda:</span> {mtg.agenda}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> {mtg.location}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />{' '}
                          {(mtg.participantDetails || mtg.attendees || []).length} Attendees
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {mtg.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleCompleteMeeting(mtg.id)}
                            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Complete
                          </button>
                        )}
                        {!isEmployee && (
                          <button
                            onClick={() => setDeleteId(mtg.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Cancel Meeting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT DETAILS / NOTES / AI SUMMARY DRAWER COLUMN */}
          <div className="lg:col-span-1">
            {selectedMeeting ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 sticky top-8">
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Active Meeting Workspace
                    </span>
                    <h2 className="text-base font-bold text-white leading-tight mt-0.5">{selectedMeeting.title}</h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{selectedMeeting.clientName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* WORKSPACE NAVIGATION TABS */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      activeTab === 'summary' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> AI Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      activeTab === 'notes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3" /> Notes
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      activeTab === 'participants' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3 h-3" /> People
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      activeTab === 'actions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Actions
                  </button>
                </div>

                {/* TAB CONTENT 1: AI SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" /> Executive AI Summary
                      </h3>
                      <button
                        onClick={handleGenerateAiSummary}
                        disabled={isGeneratingAi}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        {isGeneratingAi ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>{isGeneratingAi ? 'Generating...' : 'Run Gemini AI'}</span>
                      </button>
                    </div>

                    {selectedMeeting.aiSummary ? (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                        <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                          {selectedMeeting.aiSummary}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-2xl">
                        <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-bold text-slate-300">No AI Summary Generated</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Click "Run Gemini AI" to automatically synthesize key decisions and action points.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT 2: MEETING NOTES */}
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Discussion Points & Notes
                      </label>
                      <button
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow flex items-center gap-1"
                      >
                        {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>

                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={8}
                      placeholder="Record meeting notes, discussion points, key decisions..."
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
                    />
                  </div>
                )}

                {/* TAB CONTENT 3: PARTICIPANTS */}
                {activeTab === 'participants' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" /> Attendees & Stakeholders
                    </h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(selectedMeeting.participantDetails || []).map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block text-xs">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.email}</span>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-800 text-emerald-300 border border-slate-700 block">
                              {p.role}
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Participant Form */}
                    <form onSubmit={handleAddParticipant} className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block">Invite Participant</span>
                      <input
                        type="text"
                        value={newPartName}
                        onChange={(e) => setNewPartName(e.target.value)}
                        placeholder="Full Name"
                        required
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="email"
                        value={newPartEmail}
                        onChange={(e) => setNewPartEmail(e.target.value)}
                        placeholder="Email Address"
                        required
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newPartRole}
                          onChange={(e) => setNewPartRole(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="ATTENDEE">Attendee</option>
                          <option value="CLIENT">Client</option>
                          <option value="GUEST">Guest</option>
                          <option value="HOST">Host</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shrink-0"
                        >
                          Invite
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB CONTENT 4: ACTION ITEMS */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Deliverables & Action Items
                    </h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(selectedMeeting.actionItems || []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 text-center">No action items logged yet.</p>
                      ) : (
                        (selectedMeeting.actionItems || []).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleAction(item.id)}
                            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2.5 cursor-pointer hover:border-emerald-800 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => {}}
                              className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div className="flex-1 text-xs">
                              <span
                                className={`font-semibold block ${
                                  item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                                }`}
                              >
                                {item.task}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="text-emerald-400 font-bold">{item.assignee}</span>
                                {item.dueDate && <span>Due: {item.dueDate}</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Action Item Form */}
                    <form onSubmit={handleAddActionItem} className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block">Add Action Item</span>
                      <input
                        type="text"
                        value={newActionTask}
                        onChange={(e) => setNewActionTask(e.target.value)}
                        placeholder="Task description..."
                        required
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newActionAssignee}
                          onChange={(e) => setNewActionAssignee(e.target.value)}
                          placeholder="Assignee (e.g. Robert Black)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shrink-0"
                        >
                          Add Task
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl sticky top-8">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">Select a Meeting</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Click any scheduled meeting on the list or calendar to inspect notes, participants, and generate AI meeting summaries.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE MEETING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" /> Schedule Advisory Call
            </h3>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Q3 Board Audit & Valuation Review"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Client Firm
                </label>
                <input
                  type="text"
                  name="clientName"
                  required
                  placeholder="e.g. Meridian Real Estate Holdings"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={selectedCalendarDate || '2026-08-12'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Time Window
                  </label>
                  <input
                    type="text"
                    name="time"
                    required
                    defaultValue="10:00 AM - 11:30 AM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Meeting Category
                  </label>
                  <select
                    name="type"
                    defaultValue="STRATEGY_REVIEW"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STRATEGY_REVIEW">Strategy Review</option>
                    <option value="BOARD_PRESENTATION">Board Presentation</option>
                    <option value="BOARD_ADVISORY">Board Advisory</option>
                    <option value="DUE_DILIGENCE">Due Diligence</option>
                    <option value="TAX_PLANNING">Tax Planning</option>
                    <option value="PITCH_REVIEW">Pitch Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Location / Platform
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue="Executive Boardroom & Zoom"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Agenda Summary
                </label>
                <textarea
                  name="agenda"
                  rows={2}
                  placeholder="Review ASC 842 lease compliance & debt refinancing parameters..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
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
                  <span>Schedule Call</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Cancel Advisory Meeting"
        message="Are you sure you want to remove this meeting from the executive calendar?"
        confirmText="Cancel Meeting"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
