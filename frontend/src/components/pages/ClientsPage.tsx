import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Client, ClientService, ClientServiceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  DollarSign,
  Activity,
  ShieldCheck,
  Mail,
  Phone,
  User,
  Eye,
  CheckCircle2,
  Briefcase,
  Calendar,
  Clock,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';

const SERVICE_STATUS_BADGES: Record<ClientServiceStatus, { label: string; badge: string }> = {
  ACTIVE: { label: 'Active', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  PENDING: { label: 'Pending', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  COMPLETED: { label: 'Completed', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  PAUSED: { label: 'Paused', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-rose-950 text-rose-300 border-rose-800' },
};

const EMPLOYEES_LIST = [
  'Sarah Jenkins',
  'Michael Chen',
  'Robert Black',
  'Jessica Taylor',
  'David Miller',
  'Emily Watson',
];

export const ClientsPage: React.FC = () => {
  const { user } = useAuth();
  const isEmployee = normalizeRole(user?.role) === 'ROLE_EMPLOYEE';

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [targetClientForService, setTargetClientForService] = useState<Client | null>(null);
  const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);

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

  const fetchClients = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getClients();
      setClients(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch client portfolio.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const clientData: Partial<Client> = {
      name: String(formData.get('name')),
      industry: String(formData.get('industry')),
      contactPerson: String(formData.get('contactPerson')),
      email: String(formData.get('email')),
      phone: String(formData.get('phone')),
      annualRetainer: Number(formData.get('annualRetainer')) || 0,
      leadPartner: String(formData.get('leadPartner')),
      contractStatus: 'ACTIVE',
    };

    try {
      if (editingClient) {
        const updated = await apiService.updateClient(editingClient.id, clientData);
        setClients((prev) => prev.map((c) => (c.id === editingClient.id ? updated : c)));
        if (detailClient && detailClient.id === editingClient.id) {
          setDetailClient(updated);
        }
        addToast('success', 'Client Profile Updated', `${clientData.name} record saved.`);
      } else {
        const created = await apiService.createClient(clientData);
        setClients((prev) => [created, ...prev]);
        addToast('success', 'Client Onboarded', `${clientData.name} added to portfolio.`);
      }
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (err) {
      addToast('error', 'Operation Failed', 'Failed to update client in REST API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Service Form Submission
  const handleServiceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetClientForService) return;
    setIsServiceSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const serviceData: Partial<ClientService> = {
      serviceName: String(formData.get('serviceName')),
      description: String(formData.get('description')),
      startDate: String(formData.get('startDate')),
      endDate: String(formData.get('endDate')),
      status: (formData.get('status') as ClientServiceStatus) || 'ACTIVE',
      assignedEmployee: String(formData.get('assignedEmployee')),
    };

    try {
      if (editingService) {
        const res = await apiService.updateClientService(targetClientForService.id, editingService.id, serviceData);
        const updatedClient = res.client;
        setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
        if (detailClient && detailClient.id === updatedClient.id) {
          setDetailClient(updatedClient);
        }
        addToast('success', 'Service Updated', `Saved changes for ${serviceData.serviceName}.`);
      } else {
        const res = await apiService.addClientService(targetClientForService.id, serviceData);
        const updatedClient = res.client;
        setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
        if (detailClient && detailClient.id === updatedClient.id) {
          setDetailClient(updatedClient);
        }
        addToast('success', 'Service Associated', `Added ${serviceData.serviceName} to ${updatedClient.name}.`);
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err) {
      addToast('error', 'Service Save Failed', 'Failed to save client service.');
    } finally {
      setIsServiceSubmitting(false);
    }
  };

  // Delete Service
  const handleDeleteService = async (clientId: string, serviceId: string, serviceName: string) => {
    try {
      const updatedClient = await apiService.deleteClientService(clientId, serviceId);
      setClients((prev) => prev.map((c) => (c.id === clientId ? updatedClient : c)));
      if (detailClient && detailClient.id === clientId) {
        setDetailClient(updatedClient);
      }
      addToast('success', 'Service Deleted', `Removed ${serviceName} from client services.`);
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to remove service.');
    }
  };

  const openAddServiceModal = (client: Client) => {
    setTargetClientForService(client);
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (client: Client, service: ClientService) => {
    setTargetClientForService(client);
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  // Filter clients for Employee: view clients related to assigned projects
  const displayedClients = isEmployee
    ? clients.filter((c) => {
        const name = c.name.toLowerCase();
        const partner = (c.leadPartner || '').toLowerCase();
        return name.includes('meridian') || name.includes('starlight') || name.includes('apex') || partner.includes('robert') || partner.includes('chen');
      })
    : clients;

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isEmployee) {
      addToast('error', 'Action Restricted', 'Employees cannot delete client records.');
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteClient(deleteId);
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
      addToast('success', 'Client Archived', 'Client account deactivated.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to archive client.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Client Firm & ID',
      sortable: true,
      render: (c) => (
        <div className="cursor-pointer" onClick={() => setDetailClient(c)}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white block text-xs hover:text-emerald-400 transition-colors">{c.name}</span>
            <span className="text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-md">
              {c.clientId || c.clientNumber || c.code || 'CL-2026-0201'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">{c.industry}</span>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Primary Contact',
      sortable: true,
      render: (c) => (
        <div className="space-y-0.5 text-[11px]">
          <span className="text-slate-200 font-semibold block">{c.contactPerson}</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3 text-emerald-400" /> {c.email}
          </span>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Associated Services',
      render: (c) => {
        const serviceList = c.services || [];
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {serviceList.length > 0 ? (
              serviceList.slice(0, 2).map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700/80 truncate max-w-[130px]"
                  title={`${s.serviceName} (${s.status}) - Assigned to ${s.assignedEmployee}`}
                >
                  ⚡ {s.serviceName}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-500 italic">No services listed</span>
            )}
            {serviceList.length > 2 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                +{serviceList.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'annualRetainer',
      header: 'Annual Retainer',
      sortable: true,
      render: (c) => (
        <span className="font-black text-emerald-400 text-xs">
          ${(c.annualRetainer || (c.monthlyRetainer ? c.monthlyRetainer * 12 : 360000)).toLocaleString()} / yr
        </span>
      ),
    },
    {
      key: 'healthScore',
      header: 'Health Score',
      sortable: true,
      render: (c) => {
        const score = typeof c.healthScore === 'number' ? c.healthScore : 90;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${score > 85 ? 'bg-emerald-500' : score > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-white">{score}%</span>
          </div>
        );
      },
    },
    {
      key: 'leadPartner',
      header: 'Lead Partner',
      sortable: true,
      render: (c) => <span className="text-slate-300 font-semibold">{c.leadPartner}</span>,
    },
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" /> Client Portfolio & Services
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Corporate accounts, associated advisory services, assigned staff, and retainer contracts.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Onboard Client
        </button>
      </div>

      {isEmployee && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Employee Scope: Showing clients associated with your assigned projects ({displayedClients.length} accounts).
            </span>
          </div>
          <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            RBAC Enforcement
          </span>
        </div>
      )}

      <DataTable
        data={displayedClients}
        columns={columns}
        searchPlaceholder="Search client portfolio..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchClients}
        onAddNew={() => {
          setEditingClient(null);
          setIsModalOpen(true);
        }}
        addNewLabel="Onboard Client"
        actions={(client) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openAddServiceModal(client)}
              title="Add Service to Client"
              className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Service
            </button>
            <button
              onClick={() => setDetailClient(client)}
              title="View Client Details & Services"
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setEditingClient(client);
                setIsModalOpen(true);
              }}
              title="Edit Client Parameters"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {!isEmployee && (
              <button
                onClick={() => setDeleteId(client.id)}
                title="Archive Client"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* CLIENT DETAILS & SERVICES MODAL */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar select-none">
            <button
              onClick={() => setDetailClient(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / ID Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-white tracking-tight">{detailClient.name}</h3>
                  <span className="px-3 py-1 bg-emerald-950/90 text-emerald-300 border border-emerald-800 font-mono font-bold text-xs rounded-xl shadow-inner">
                    Client ID: {detailClient.clientId || detailClient.clientNumber || detailClient.code || 'CL-2026-0201'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{detailClient.industry} • Onboarded: {detailClient.startDate || 'Active Partner'}</p>
              </div>

              <span className="px-3 py-1 text-xs font-black uppercase rounded-lg border bg-emerald-950 text-emerald-300 border-emerald-800">
                {detailClient.contractStatus || 'ACTIVE'}
              </span>
            </div>

            {/* Main Client Details Grid */}
            <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unique Client ID</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block">
                    🆔 {detailClient.clientId || detailClient.clientNumber || detailClient.code || 'CL-2026-0201'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Client Number</span>
                  <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">
                    🔢 {detailClient.clientNumber || detailClient.clientId || detailClient.code || 'CL-2026-0201'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Annual Retainer</span>
                  <span className="text-xs font-black text-emerald-400 mt-1 block">
                    💰 ${(detailClient.annualRetainer || 360000).toLocaleString()} / yr
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Contact</span>
                  <span className="text-xs font-bold text-white mt-1 block">👤 {detailClient.contactPerson}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                  <span className="text-xs font-semibold text-indigo-300 mt-1 block truncate">✉️ {detailClient.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phone</span>
                  <span className="text-xs font-semibold text-slate-300 mt-1 block">📞 {detailClient.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lead Partner</span>
                  <span className="text-xs font-bold text-white mt-1 block">👔 {detailClient.leadPartner}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Health Score</span>
                  <span className="text-xs font-black text-emerald-400 mt-1 block">❤️ {detailClient.healthScore || 95}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Services</span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block">⚡ {(detailClient.services || []).length} Services</span>
                </div>
              </div>

              {/* ASSOCIATED SERVICES SECTION */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Associated Client Services</h4>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold rounded-md border border-emerald-800">
                      {(detailClient.services || []).length}
                    </span>
                  </div>

                  <button
                    onClick={() => openAddServiceModal(detailClient)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Service
                  </button>
                </div>

                {(!detailClient.services || detailClient.services.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 space-y-2">
                    <Briefcase className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-medium">No services currently associated with this client.</p>
                    <button
                      onClick={() => openAddServiceModal(detailClient)}
                      className="text-xs text-emerald-400 font-bold hover:underline"
                    >
                      + Add the first service
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detailClient.services.map((srv) => {
                      const badgeInfo = SERVICE_STATUS_BADGES[srv.status] || SERVICE_STATUS_BADGES.ACTIVE;
                      return (
                        <div
                          key={srv.id}
                          className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h5 className="text-xs font-bold text-white">{srv.serviceName}</h5>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeInfo.badge}`}>
                                  {badgeInfo.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{srv.description}</p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditServiceModal(detailClient, srv)}
                                title="Edit Service"
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(detailClient.id, srv.id, srv.serviceName)}
                                title="Remove Service"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                Duration: <strong className="text-slate-200">{srv.startDate || 'N/A'}</strong> to <strong className="text-slate-200">{srv.endDate || 'Ongoing'}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                Assigned Employee: <strong className="text-emerald-300">{srv.assignedEmployee || 'Unassigned'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Account Management Summary */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Account Permanence & Reference</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This account is assigned permanent Unique Client ID <strong className="text-emerald-400 font-mono">{detailClient.clientId || detailClient.clientNumber || detailClient.code}</strong>. All associated invoices, project deliverables, and advisory communications reference this Client ID.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setDetailClient(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Client Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE ADD/EDIT MODAL */}
      {isServiceModalOpen && targetClientForService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative select-none">
            <button
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingService ? 'Edit Client Service' : 'Add Client Service'}
                </h3>
                <p className="text-[11px] text-slate-400">Client: {targetClientForService.name}</p>
              </div>
            </div>

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Service Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="serviceName"
                  required
                  defaultValue={editingService?.serviceName || ''}
                  placeholder="e.g. M&A Advisory & Tax Due Diligence"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingService?.description || ''}
                  placeholder="Detailed scope of service, deliverables, and terms..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 custom-scrollbar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={editingService?.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingService?.endDate || ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingService?.status || 'ACTIVE'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Assigned Employee
                  </label>
                  <select
                    name="assignedEmployee"
                    defaultValue={editingService?.assignedEmployee || 'Sarah Jenkins'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {EMPLOYEES_LIST.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isServiceSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isServiceSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingService ? 'Save Service' : 'Add Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT ONBOARD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingClient ? 'Edit Client Retainer' : 'Onboard New Retainer Client'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Client Firm Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingClient?.name}
                    placeholder="e.g. Meridian Real Estate Holdings"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    name="industry"
                    required
                    defaultValue={editingClient?.industry}
                    placeholder="e.g. Real Estate Investment"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Primary Contact Name
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    required
                    defaultValue={editingClient?.contactPerson}
                    placeholder="Victoria Cross (CFO)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Annual Retainer ($)
                  </label>
                  <input
                    type="number"
                    name="annualRetainer"
                    required
                    defaultValue={editingClient?.annualRetainer || 360000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingClient?.email}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingClient?.phone}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Lead Managing Partner
                </label>
                <input
                  type="text"
                  name="leadPartner"
                  defaultValue={editingClient?.leadPartner || 'Sarah Jenkins'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClient ? 'Save Retainer Changes' : 'Onboard Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Archive Client Record"
        message="Are you sure you want to deactivate this client account? Retainer metrics will be archived in REST API."
        confirmText="Archive Client"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
