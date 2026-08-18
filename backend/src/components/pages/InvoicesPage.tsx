import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Invoice, InvoiceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { Modal } from '../common/Modal';
import {
  DollarSign,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Printer,
  User,
  Building,
  Briefcase,
  Calendar,
  Percent,
  Eye,
  FileCheck,
  Send,
  CreditCard
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';
  const isClient = canonicalRole === 'ROLE_CLIENT';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Invoice Preview & PDF Modal State
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Create Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [subtotalInput, setSubtotalInput] = useState<number>(0);
  const [gstRateInput, setGstRateInput] = useState<number>(10);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getInvoices();
      setInvoices(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch billing invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const computedGst = Math.round(subtotalInput * (gstRateInput / 100));
  const computedTotal = subtotalInput + computedGst;

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const clientName = String(formData.get('clientName'));
    const projectName = String(formData.get('projectName'));
    const dueDate = String(formData.get('dueDate'));
    const serviceDescription = String(formData.get('serviceDescription'));

    const invData: Partial<Invoice> = {
      clientName,
      projectName,
      project: projectName,
      subtotal: subtotalInput,
      amount: subtotalInput,
      gstRate: gstRateInput,
      gst: computedGst,
      tax: computedGst,
      totalAmount: computedTotal,
      dueDate,
      serviceDescription,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      items: [
        {
          id: `ii-${Date.now()}`,
          serviceDescription: serviceDescription || 'Executive Strategic Advisory',
          amount: subtotalInput,
        },
      ],
    };

    try {
      const created = await apiService.createInvoice(invData);
      setInvoices((prev) => [created, ...prev]);
      addToast('success', 'Invoice Issued', `Tax Invoice ${created.invoiceNumber} created successfully.`);
      setIsModalOpen(false);
    } catch (err) {
      addToast('error', 'Creation Failed', 'Failed to save invoice to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      const updated = await apiService.updateInvoice(inv.id, { status: 'PAID', paymentStatus: 'PAID' });
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
      if (previewInvoice?.id === inv.id) {
        setPreviewInvoice(updated);
      }
      addToast('success', 'Payment Verified', `Invoice ${inv.invoiceNumber} marked as PAID.`);
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update payment status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isClient || isEmployee) {
      addToast('error', 'Action Restricted', 'You do not have permission to void invoice records.');
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteInvoice(deleteId);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
      if (previewInvoice?.id === deleteId) {
        setPreviewInvoice(null);
      }
      addToast('success', 'Invoice Voided', 'Invoice record deleted from backend.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to void invoice.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Trigger PDF Download or Print Dialog
  const handleDownloadPDF = (inv: Invoice) => {
    setPreviewInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filter invoices for Client role
  const displayedInvoices = isClient
    ? invoices.filter((i) => {
        const c = (i.clientName || '').toLowerCase();
        return c.includes('starlight') || c.includes('bio') || c.includes('vance');
      })
    : invoices;

  const totalCollected = displayedInvoices
    .filter((i) => (i.paymentStatus || i.status) === 'PAID')
    .reduce((acc, curr) => acc + (curr.totalAmount || curr.amount || 0), 0);

  const totalPending = displayedInvoices
    .filter((i) => (i.paymentStatus || i.status) === 'PENDING' || (i.paymentStatus || i.status) === 'OVERDUE')
    .reduce((acc, curr) => acc + (curr.totalAmount || curr.amount || 0), 0);

  const totalGstCollected = displayedInvoices
    .filter((i) => (i.paymentStatus || i.status) === 'PAID')
    .reduce((acc, curr) => acc + (curr.gst || curr.tax || Math.round((curr.amount || 0) * 0.1)), 0);

  // DataTable Column definitions for INVOICES as requested
  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice Number',
      sortable: true,
      render: (i) => (
        <div>
          <span className="font-mono font-bold text-emerald-400 block text-xs bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded w-fit">
            {i.invoiceNumber}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Issued: {i.issueDate || '2026-07-01'}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client & ID',
      sortable: true,
      render: (i) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-200 font-semibold text-xs">{i.clientName}</span>
          </div>
          {((i as any).clientId || (i as any).clientNumber) && (
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded w-fit mt-0.5">
              Client ID: {(i as any).clientId || (i as any).clientNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      sortable: true,
      render: (i) => (
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-300 text-xs line-clamp-1">{i.projectName || i.project || i.serviceDescription || 'General Advisory'}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount ($)',
      sortable: true,
      render: (i) => {
        const sub = i.subtotal || i.amount || 0;
        return <span className="font-mono text-slate-200 font-bold text-xs">${sub.toLocaleString()}</span>;
      },
    },
    {
      key: 'gst',
      header: 'GST',
      sortable: true,
      render: (i) => {
        const sub = i.subtotal || i.amount || 0;
        const gstVal = i.gst !== undefined ? i.gst : i.tax !== undefined ? i.tax : Math.round(sub * 0.1);
        const totalVal = i.totalAmount !== undefined ? i.totalAmount : sub + gstVal;

        return (
          <div>
            <span className="font-mono text-amber-400 font-semibold text-[11px] block">+${gstVal.toLocaleString()} GST</span>
            <span className="font-mono font-bold text-emerald-400 text-xs block">Total: ${totalVal.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (i) => (
        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>{i.dueDate}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Payment Status',
      sortable: true,
      render: (i) => {
        const statusVal = i.paymentStatus || i.status;
        return (
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${
              statusVal === 'PAID'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : statusVal === 'OVERDUE'
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : statusVal === 'CANCELLED'
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-amber-950/80 text-amber-400 border-amber-800'
            }`}
          >
            {statusVal}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Download PDF',
      sortable: false,
      render: (i) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleDownloadPDF(i)}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
            title="Download PDF Invoice"
          >
            <Download className="w-3 h-3" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => setPreviewInvoice(i)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
            title="Preview Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            <span>Invoices & GST Tax Billing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage practice retainer invoices, track GST compliance, project line items, payment status, and export PDF statements.
          </p>
        </div>

        {!isClient && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Issue Tax Invoice
          </button>
        )}
      </div>

      {isClient && (
        <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-300 font-semibold shadow-lg print:hidden">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Client Portal Access: Displaying invoices and GST tax statements for your organization ({displayedInvoices.length} records).
            </span>
          </div>
          <span className="text-[10px] bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            Client Organization
          </span>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue Collected</span>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">${totalCollected.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500">Includes verified bank wire payments</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Receivables</span>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">${totalPending.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500">Pending & past due invoices</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total GST Tax Collected</span>
            <p className="text-2xl font-black text-blue-400 font-mono mt-1">${totalGstCollected.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500">IRS / ATO GST tax obligation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="print:hidden">
        <DataTable
          data={displayedInvoices}
          columns={columns}
          searchPlaceholder="Search by invoice #, client name, project title, status..."
          isLoading={isLoading}
          isError={isError}
          onRetry={fetchInvoices}
          onAddNew={!isClient ? () => setIsModalOpen(true) : undefined}
          addNewLabel={!isClient ? 'Issue Tax Invoice' : undefined}
          actions={
            !isClient
              ? (inv) => (
                  <div className="flex items-center justify-end gap-2">
                    {(inv.paymentStatus || inv.status) !== 'PAID' && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                        title="Mark Payment Paid"
                      >
                        Confirm Payment
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Void Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              : undefined
          }
        />
      </div>

      {/* INVOICE PREVIEW & PDF VIEW MODAL */}
      <Modal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        title={`Tax Invoice ${previewInvoice?.invoiceNumber || ''}`}
        subtitle="Official Tax Invoice Statement & Download"
        maxWidth="2xl"
      >
        {previewInvoice && (
          <div className="space-y-6 text-xs text-slate-300">
            {/* Invoice Printable View Sheet */}
            <div className="bg-white text-slate-900 p-6 md:p-8 rounded-2xl shadow-xl space-y-6 font-sans">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">ARCHICORP PRACTICE MANAGEMENT</h2>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                    Executive Financial & M&A Advisory Firm
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    100 Pine Street, Suite 2400 • San Francisco, CA 94111 • Tax ID: US-993821049
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800">
                    TAX INVOICE
                  </span>
                  <p className="text-[11px] font-mono font-bold text-emerald-700 mt-1">{previewInvoice.invoiceNumber}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Date: {previewInvoice.issueDate || '2026-07-01'}</p>
                </div>
              </div>

              {/* Client & Project Specs */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billed To Client</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{previewInvoice.clientName}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Corporate Account #CL-{previewInvoice.id.slice(-4)}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Engagement Project</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{previewInvoice.projectName || previewInvoice.project || 'Advisory Services'}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                    <span>Payment Due Date:</span>
                    <strong className="text-slate-900 font-mono">{previewInvoice.dueDate}</strong>
                  </p>
                </div>
              </div>

              {/* Line Item Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="p-3">Deliverable & Service Line Description</th>
                      <th className="p-3 text-right w-32">Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {(previewInvoice.items && previewInvoice.items.length > 0
                      ? previewInvoice.items
                      : [
                          {
                            id: '1',
                            serviceDescription: previewInvoice.serviceDescription || 'Executive Strategic Retainer',
                            amount: previewInvoice.subtotal || previewInvoice.amount || 45000,
                          },
                        ]
                    ).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-3 font-medium text-slate-900">{item.serviceDescription}</td>
                        <td className="p-3 text-right font-mono font-bold">${(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-300 bg-slate-50">
                    <tr>
                      <td className="p-2.5 text-right font-semibold text-slate-600 text-[11px]">Subtotal (Excl. Tax):</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ${(previewInvoice.subtotal || previewInvoice.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-right font-semibold text-amber-700 text-[11px]">GST ({previewInvoice.gstRate || 10}%):</td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                        +$
                        {(
                          previewInvoice.gst !== undefined
                            ? previewInvoice.gst
                            : previewInvoice.tax !== undefined
                            ? previewInvoice.tax
                            : Math.round((previewInvoice.amount || 0) * 0.1)
                        ).toLocaleString()}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-300 font-bold text-sm bg-emerald-50 text-slate-900">
                      <td className="p-3 text-right uppercase text-[11px] text-emerald-800">Total Invoice Amount Payable:</td>
                      <td className="p-3 text-right font-mono text-base text-emerald-800">
                        $
                        {(
                          previewInvoice.totalAmount !== undefined
                            ? previewInvoice.totalAmount
                            : (previewInvoice.amount || 0) + Math.round((previewInvoice.amount || 0) * 0.1)
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Status & Wire Instructions */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Status</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      (previewInvoice.paymentStatus || previewInvoice.status) === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {previewInvoice.paymentStatus || previewInvoice.status}
                  </span>
                </div>

                <div className="text-right text-[10px] text-slate-600">
                  <p className="font-bold text-slate-800">Remit Wire To:</p>
                  <p>First National Bank • Routing: 121000358 • Acct: 8849-0192-33</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(previewInvoice)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF / Print</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue Practice Tax Invoice"
        subtitle="Specify client, project, line subtotal, and GST rate"
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Organization *</label>
            <input
              type="text"
              name="clientName"
              required
              placeholder="e.g. Meridian Real Estate Holdings"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Name *</label>
            <input
              type="text"
              name="projectName"
              required
              placeholder="e.g. ASC 842 Commercial Lease Audit"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Subtotal ($) *</label>
              <input
                type="number"
                required
                value={subtotalInput}
                onChange={(e) => setSubtotalInput(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">GST Tax Rate (%)</label>
              <select
                value={gstRateInput}
                onChange={(e) => setGstRateInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={10}>10% GST</option>
                <option value={18}>18% GST</option>
                <option value={5}>5% GST</option>
                <option value={0}>0% Tax Exempt</option>
              </select>
            </div>
          </div>

          {/* Computed Tax Summary Box */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>${subtotalInput.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-semibold">
              <span>GST ({gstRateInput}%):</span>
              <span>+${computedGst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
              <span>Total Payable Amount:</span>
              <span>${computedTotal.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Due Date *</label>
            <input
              type="date"
              name="dueDate"
              required
              defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Service Line Description</label>
            <textarea
              name="serviceDescription"
              rows={2}
              required
              defaultValue="Monthly Fractional CFO Retainer & M&A Due Diligence Deliverables"
              placeholder="Detailed description of advisory deliverables..."
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Issue Invoice</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Void Invoice"
        message="Are you sure you want to void and remove this invoice from records?"
        confirmText="Void Invoice"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
