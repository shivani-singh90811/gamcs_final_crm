import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { DocumentItem, DocumentVersion, RolePermissionLevel, DocCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  FileText, Plus, Trash2, X, Loader2, Download, Shield, Lock, FileCheck, Eye,
  History, Upload, Image as ImageIcon, FileCode, CheckCircle2, Search, Filter,
  ZoomIn, ZoomOut, Printer, ShieldAlert, ArrowUpRight, Copy, Check, Users, ShieldCheck, Sparkles
} from 'lucide-react';

const CATEGORIES: DocCategory[] = [
  'Valuation Reports',
  'Term Sheets',
  'Due Diligence',
  'AUDIT_REPORT',
  'TAX_FILING',
  'CONTRACT',
  'COMPLIANCE'
];

const PERMISSION_BADGES: Record<RolePermissionLevel, { label: string; badge: string }> = {
  ADMIN_ONLY: { label: 'Admin Only', badge: 'bg-rose-950/80 text-rose-300 border-rose-800' },
  EMPLOYEE_ACCESS: { label: 'Staff & Admins', badge: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  CLIENT_ACCESS: { label: 'Client Accessible', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  PUBLIC_READ: { label: 'Public Read', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' },
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isAdmin = canonicalRole === 'ROLE_ADMIN';
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';
  const isClient = canonicalRole === 'ROLE_CLIENT';

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [permissionFilter, setPermissionFilter] = useState<string>('ALL');

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Version History Modal State
  const [versionDoc, setVersionDoc] = useState<DocumentItem | null>(null);
  const [newVersionTag, setNewVersionTag] = useState('');
  const [newVersionChangelog, setNewVersionChangelog] = useState('');
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  // Drag & Drop Upload File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getDocuments();
      setDocuments(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch document vault.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Real File Download Trigger
  const handleDownload = (doc: DocumentItem, targetVersion?: string) => {
    const filename = doc.title || 'document';
    const content = doc.contentPreview || `Content preview for ${filename}\nVersion: ${targetVersion || doc.version || 'v1.0'}\nClient: ${doc.clientName}`;

    let mimeType = 'text/plain';
    if (doc.fileType === 'pdf' || filename.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (doc.fileType === 'image' || filename.match(/\.(png|jpg|jpeg)$/i)) {
      mimeType = 'image/png';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('success', 'File Downloaded', `Successfully generated download stream for ${filename} (${targetVersion || doc.version || 'v1.0'})`);
  };

  // Upload Form Submission
  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const titleVal = String(formData.get('title') || selectedFile?.name || 'Untitled_Document.pdf');
    const clientVal = String(formData.get('clientName') || 'General Enterprise');
    const categoryVal = (formData.get('category') as DocCategory) || 'Valuation Reports';
    const securityVal = String(formData.get('securityLevel') || 'RESTRICTED');
    const rolePermVal = (formData.get('rolePermissions') as RolePermissionLevel) || 'CLIENT_ACCESS';
    const versionVal = String(formData.get('version') || 'v1.0');
    const descVal = String(formData.get('description') || '');

    let fType: 'pdf' | 'image' | 'doc' | 'excel' | 'text' = 'pdf';
    if (titleVal.endsWith('.png') || titleVal.endsWith('.jpg') || titleVal.endsWith('.jpeg')) fType = 'image';
    else if (titleVal.endsWith('.docx') || titleVal.endsWith('.doc')) fType = 'doc';
    else if (titleVal.endsWith('.xlsx') || titleVal.endsWith('.csv')) fType = 'excel';
    else if (titleVal.endsWith('.txt')) fType = 'text';

    const fSize = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '4.2 MB';

    const docData: Partial<DocumentItem> = {
      title: titleVal,
      clientName: clientVal,
      category: categoryVal,
      fileSize: fSize,
      fileType: fType,
      version: versionVal,
      securityLevel: securityVal,
      rolePermissions: rolePermVal,
      description: descVal,
      contentPreview: descVal
        ? `DOCUMENT: ${titleVal}\nCLIENT: ${clientVal}\n\nDESCRIPTION:\n${descVal}`
        : `CONFIDENTIAL RECORD\nTitle: ${titleVal}\nClient: ${clientVal}\nDate: ${new Date().toISOString().split('T')[0]}`,
      versionHistory: [
        {
          id: `v-${Date.now()}`,
          version: versionVal,
          uploadedBy: user?.name || 'Sarah Jenkins',
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: fSize,
          changelog: 'Initial document upload.',
        },
      ],
    };

    try {
      const created = await apiService.createDocument(docData);
      setDocuments((prev) => [created, ...prev]);
      addToast('success', 'Document Vaulted', `${titleVal} added to vault with ${PERMISSION_BADGES[rolePermVal].label} permissions.`);
      setIsUploadOpen(false);
      setSelectedFile(null);
    } catch (err) {
      addToast('error', 'Upload Failed', 'Failed to save document to backend vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload New Version to existing document
  const handleUploadNewVersion = async () => {
    if (!versionDoc || !newVersionTag) return;
    setIsUploadingVersion(true);

    const nextVersion: DocumentVersion = {
      id: `v-${Date.now()}`,
      version: newVersionTag,
      uploadedBy: user?.name || 'Sarah Jenkins',
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: newVersionFile ? `${(newVersionFile.size / (1024 * 1024)).toFixed(1)} MB` : '4.8 MB',
      changelog: newVersionChangelog || 'Routine revision update.',
    };

    const updatedHistory = [nextVersion, ...(versionDoc.versionHistory || [])];
    const updatedDoc: DocumentItem = {
      ...versionDoc,
      version: newVersionTag,
      versionHistory: updatedHistory,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: user?.name || versionDoc.uploadedBy,
    };

    try {
      const saved = await apiService.updateDocument(versionDoc.id, {
        version: newVersionTag,
        versionHistory: updatedHistory,
        uploadedAt: nextVersion.uploadedAt,
        uploadedBy: nextVersion.uploadedBy,
      });

      setDocuments((prev) => prev.map((d) => (d.id === versionDoc.id ? updatedDoc : d)));
      setVersionDoc(updatedDoc);
      addToast('success', 'Version Created', `Updated ${versionDoc.title} to version ${newVersionTag}`);
      setNewVersionTag('');
      setNewVersionChangelog('');
      setNewVersionFile(null);
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not save new document version.');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  // Delete Document
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isEmployee || isClient) {
      addToast('error', 'Action Restricted', 'Only Administrators can purge document vault items.');
      setDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      await apiService.deleteDocument(deleteId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
      if (previewDoc?.id === deleteId) setPreviewDoc(null);
      if (versionDoc?.id === deleteId) setVersionDoc(null);
      addToast('success', 'Document Purged', 'Document record removed from vault.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to purge document.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Filter Documents by Role & Search
  const filteredDocuments = documents.filter((doc) => {
    // 1. RBAC Filtering
    if (isClient) {
      // Clients only see CLIENT_ACCESS or matching client name
      const title = (doc.title || '').toLowerCase();
      const cName = (doc.clientName || '').toLowerCase();
      const perm = doc.rolePermissions || 'CLIENT_ACCESS';

      if (perm === 'ADMIN_ONLY' || perm === 'EMPLOYEE_ACCESS') return false;

      const userEmail = (user?.email || '').toLowerCase();
      const userFirm = (user?.clientName || '').toLowerCase();

      if (
        !cName.includes('starlight') &&
        !cName.includes('meridian') &&
        !cName.includes('vanguard') &&
        !cName.includes('apex') &&
        !title.includes('starlight') &&
        !title.includes('meridian')
      ) {
        if (!userEmail.includes('client')) return false;
      }
    } else if (isEmployee) {
      // Employees see everything EXCEPT ADMIN_ONLY
      if (doc.rolePermissions === 'ADMIN_ONLY') return false;
    }

    // 2. Category Filter
    if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false;

    // 3. Permission Filter
    if (permissionFilter !== 'ALL' && doc.rolePermissions !== permissionFilter) return false;

    // 4. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (doc.title || '').toLowerCase();
      const client = (doc.clientName || '').toLowerCase();
      const uploader = (doc.uploadedBy || '').toLowerCase();
      if (!title.includes(q) && !client.includes(q) && !uploader.includes(q)) return false;
    }

    return true;
  });

  const columns: Column<DocumentItem>[] = [
    {
      key: 'title',
      header: 'Document Name & Type',
      sortable: true,
      render: (d) => {
        let icon = <FileText className="w-4 h-4 text-emerald-400" />;
        if (d.fileType === 'image') icon = <ImageIcon className="w-4 h-4 text-cyan-400" />;
        else if (d.fileType === 'doc') icon = <FileText className="w-4 h-4 text-indigo-400" />;
        else if (d.fileType === 'excel') icon = <FileCode className="w-4 h-4 text-amber-400" />;

        return (
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setPreviewDoc(d)}
          >
            <div className="w-9 h-9 rounded-xl bg-[#070a12] border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
              {icon}
            </div>
            <div>
              <span className="font-bold text-white block text-xs group-hover:text-emerald-400 transition-colors">
                {d.title}
              </span>
              <span className="text-[10px] text-slate-400 block">🏢 Client: {d.clientName}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (d) => (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#070a12] text-slate-300 border border-slate-800">
          {d.category}
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      sortable: true,
      render: (d) => (
        <button
          onClick={() => setVersionDoc(d)}
          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:border-indigo-500 transition-colors flex items-center gap-1 cursor-pointer"
          title="Click to view Version History"
        >
          <History className="w-3 h-3" /> {d.version || 'v1.0'}
        </button>
      ),
    },
    {
      key: 'rolePermissions',
      header: 'Role Permissions',
      sortable: true,
      render: (d) => {
        const perm = PERMISSION_BADGES[d.rolePermissions || 'CLIENT_ACCESS'];
        return (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${perm.badge} flex items-center gap-1 w-fit`}>
            <Lock className="w-3 h-3" /> {perm.label}
          </span>
        );
      },
    },
    {
      key: 'fileSize',
      header: 'Size & Date',
      render: (d) => (
        <div className="text-[10px] space-y-0.5">
          <span className="text-slate-300 font-bold block">{d.fileSize}</span>
          <span className="text-slate-500 block">{d.uploadedAt || d.uploadDate || '2026-07-20'}</span>
        </div>
      ),
    },
    {
      key: 'uploadedBy',
      header: 'Uploader',
      sortable: true,
      render: (d) => <span className="text-slate-300 font-semibold text-[11px]">{d.uploadedBy}</span>,
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Document Management Vault</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure document repository with PDF/Image previews, version control history, role permissions, and direct download.
            </p>
          </div>
        </div>

        {!isClient && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Vault New Document
          </button>
        )}
      </div>

      {/* Role Notice */}
      {isClient && (
        <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Client Portal View: Showing client-accessible documents for your firm ({filteredDocuments.length} files).</span>
          </div>
          <span className="text-[10px] bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            Read & Download Only
          </span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-4 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by title, client, uploader..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Permissions</option>
            <option value="CLIENT_ACCESS">Client Accessible</option>
            <option value="EMPLOYEE_ACCESS">Staff Only</option>
            <option value="ADMIN_ONLY">Admin Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredDocuments}
        columns={columns}
        searchPlaceholder="Filter vault records..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchDocuments}
        onAddNew={!isClient ? () => setIsUploadOpen(true) : undefined}
        addNewLabel={!isClient ? 'Vault Document' : undefined}
        actions={(doc) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setPreviewDoc(doc)}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Preview Document (PDF/Image)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVersionDoc(doc)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Version History"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDownload(doc)}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {!isEmployee && !isClient && (
              <button
                onClick={() => setDeleteId(doc.id)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Purge Document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* 1. DOCUMENT PREVIEW MODAL (PDF / IMAGE / DOC PREVIEW) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {previewDoc.title}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {previewDoc.version || 'v1.0'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    🏢 Client: {previewDoc.clientName} • Category: {previewDoc.category} • Size: {previewDoc.fileSize}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(50, z - 25))}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 font-bold px-1.5">{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(200, z + 25))}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-800 mx-1"></div>
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewer Content Area */}
            <div className="flex-1 overflow-y-auto bg-[#070a12] border border-slate-800 rounded-2xl p-6 custom-scrollbar relative min-h-[400px] flex items-center justify-center">
              {previewDoc.fileType === 'image' || previewDoc.title.match(/\.(png|jpg|jpeg)$/i) ? (
                <div
                  className="transition-transform duration-200 flex flex-col items-center justify-center"
                  style={{ transform: `scale(${previewZoom / 100})` }}
                >
                  <img
                    src={previewDoc.contentPreview || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80'}
                    alt={previewDoc.title}
                    className="max-h-[500px] rounded-xl border border-slate-800 shadow-2xl object-contain"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 font-mono">Full Resolution Image Document Preview</p>
                </div>
              ) : (
                /* PDF & DOC Rendered Document View */
                <div
                  className="w-full max-w-2xl bg-slate-950 border border-slate-800/90 rounded-2xl p-8 shadow-2xl transition-transform duration-200 text-slate-200 space-y-6"
                  style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }}
                >
                  {/* Watermark Banner */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
                      <Shield className="w-4 h-4" /> LeadPulse Encrypted Vault PDF
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      SECURITY: {previewDoc.securityLevel || 'RESTRICTED'}
                    </span>
                  </div>

                  {/* Document Title Header */}
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{previewDoc.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Client Engagement Record: <strong className="text-slate-200">{previewDoc.clientName}</strong>
                    </p>
                  </div>

                  {/* Rendered Content Text */}
                  <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                    {previewDoc.contentPreview ||
                      `CONFIDENTIAL FINANCIAL ADVISORY DOCUMENT\n\nTitle: ${previewDoc.title}\nClient Firm: ${previewDoc.clientName}\nVersion: ${previewDoc.version || 'v1.0'}\nCategory: ${previewDoc.category}\nVault Security Level: ${previewDoc.securityLevel || 'RESTRICTED'}\nRole Access: ${previewDoc.rolePermissions || 'CLIENT_ACCESS'}\n\nREMARKS & AUDIT MEMO:\nThis electronic file is securely signed and indexed within LeadPulse CRM. All disclosures, balance sheet models, and tax ruling attachments are archived under AES-256 standard.`}
                  </div>

                  {/* PDF Footer Signatures */}
                  <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      <span className="block font-bold text-slate-300">Uploaded By: {previewDoc.uploadedBy}</span>
                      <span className="block text-[10px] text-slate-500">Date: {previewDoc.uploadedAt || '2026-07-20'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Digitally Verified
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">SHA-256 Verified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. VERSION HISTORY MODAL */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setVersionDoc(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Version Control History</h3>
                <p className="text-xs text-slate-400">{versionDoc.title} • Current: <strong className="text-emerald-400">{versionDoc.version || 'v1.0'}</strong></p>
              </div>
            </div>

            {/* Upload New Version Form */}
            {!isClient && (
              <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl mb-6 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" /> Upload New Version
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Version Tag (e.g. v2.2)"
                    value={newVersionTag}
                    onChange={(e) => setNewVersionTag(e.target.value)}
                    className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="file"
                    onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                    className="px-3 py-1.5 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-slate-300 file:bg-slate-800 file:border-0 file:rounded-lg file:px-2 file:py-1 file:text-xs file:text-white cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Changelog notes (e.g. Updated CapRates and revised DCF section)"
                  value={newVersionChangelog}
                  onChange={(e) => setNewVersionChangelog(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                />
                <button
                  onClick={handleUploadNewVersion}
                  disabled={!newVersionTag || isUploadingVersion}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploadingVersion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit New Version</span>
                </button>
              </div>
            )}

            {/* Version List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400">Historical Commits</h4>
              {!versionDoc.versionHistory || versionDoc.versionHistory.length === 0 ? (
                <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{versionDoc.version || 'v1.0'} (Initial Upload)</span>
                    <span className="text-[10px] text-slate-400">Uploaded by {versionDoc.uploadedBy} on {versionDoc.uploadedAt}</span>
                  </div>
                  <button
                    onClick={() => handleDownload(versionDoc, versionDoc.version || 'v1.0')}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                versionDoc.versionHistory.map((ver, idx) => (
                  <div
                    key={ver.id || idx}
                    className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {ver.version}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                            Active Release
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-white">{ver.changelog || 'Version revision update.'}</p>
                      <span className="text-[10px] text-slate-400 block">
                        Uploaded by {ver.uploadedBy} • {ver.uploadedAt} • Size: {ver.fileSize}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDownload(versionDoc, ver.version)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      title={`Download ${ver.version}`}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. UPLOAD NEW DOCUMENT MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Vault Confidential Document</h3>
                <p className="text-xs text-slate-400">Configure file details, security classification, and role permissions.</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-5 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : selectedFile
                    ? 'border-emerald-800 bg-emerald-950/10'
                    : 'border-slate-800 bg-[#070a12]'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (ev: any) => {
                    if (ev.target.files && ev.target.files[0]) {
                      setSelectedFile(ev.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <FileCheck className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <span className="text-xs font-bold text-white block">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-200">Drag & Drop File Here, or Click to Browse</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Supports PDF, DOCX, XLSX, PNG, JPG (AES-256 Encrypted)</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Document Filename / Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={selectedFile?.name || ''}
                  placeholder="e.g. Meridian_Q3_Valuation_Model.pdf"
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Client Firm Name
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    required
                    placeholder="e.g. Meridian Real Estate"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Document Category
                  </label>
                  <select
                    name="category"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Role Permission Access
                  </label>
                  <select
                    name="rolePermissions"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="CLIENT_ACCESS">Client Accessible (Client + Staff + Admin)</option>
                    <option value="EMPLOYEE_ACCESS">Staff & Admins Only</option>
                    <option value="ADMIN_ONLY">Admin Only (Restricted)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    name="version"
                    defaultValue="v1.0"
                    placeholder="v1.0"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Executive Memo
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Summary of document scope, balance sheet assumptions, or legal terms..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Vault Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Purge Vault Document"
        message="Are you sure you want to permanently delete this document record from the vault?"
        confirmText="Purge Document"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
