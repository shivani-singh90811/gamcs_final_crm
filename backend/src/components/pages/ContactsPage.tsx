import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Contact } from '../../types';
import {
  Users, Plus, Search, Mail, Phone, Calendar, Edit2, Trash2, X, Loader2, CheckCircle2, Eye, Building
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { EmailHistorySection } from '../common/EmailHistorySection';
import { EmailComposerModal } from '../common/EmailComposerModal';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [detailContact, setDetailContact] = useState<Contact | null>(null);

  // Email Composer State
  const [emailComposerContact, setEmailComposerContact] = useState<Contact | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);

  // Deletion
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      addToast('error', 'API Error', 'Failed to fetch contacts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const contactData: Partial<Contact> = {
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      phone: String(formData.get('phone')),
      company: String(formData.get('company')),
      title: String(formData.get('title')),
      type: String(formData.get('type') || 'Executive'),
      status: 'ACTIVE',
      lastContacted: new Date().toLocaleDateString(),
    };

    try {
      if (editingContact) {
        const updated = await apiService.updateContact(editingContact.id, contactData);
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? updated : c)));
        addToast('success', 'Contact Updated', `${contactData.name} saved.`);
      } else {
        const created = await apiService.createContact(contactData);
        setContacts((prev) => [created, ...prev]);
        addToast('success', 'Contact Created', `New contact ${contactData.name} added.`);
      }
      setIsModalOpen(false);
      setEditingContact(null);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteContactId) return;
    setIsDeleting(true);
    try {
      await apiService.deleteContact(deleteContactId);
      setContacts((prev) => prev.filter((c) => c.id !== deleteContactId));
      addToast('success', 'Contact Deleted', 'Contact removed from directory.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not remove contact.');
    } finally {
      setIsDeleting(false);
      setDeleteContactId(null);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="p-6 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Contacts Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Directory of executive contacts, board members, and decision makers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#070a12] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => {
              setEditingContact(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>
      </div>

      {/* Cards Grid (Matching Image 3) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-[#0e1322] border border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-[#0e1322] border border-slate-800 rounded-2xl text-slate-400 text-xs">
          No contacts found in directory. Click <strong>+ Add Contact</strong> to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                    {contact.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{contact.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {contact.title} at <strong className="text-slate-200">{contact.company}</strong>
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Active
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Last Contacted: {contact.lastContacted}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/60">
                <button
                  onClick={() => {
                    setEmailComposerContact(contact);
                    setIsEmailComposerOpen(true);
                  }}
                  className="px-2.5 py-1 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Send Email to Contact"
                >
                  <Mail className="w-3 h-3" /> Email
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailContact(contact)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer"
                    title="View Contact & Email History"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingContact(contact);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => setDeleteContactId(contact.id)}
                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTACT DETAILS & EMAIL HISTORY MODAL */}
      {detailContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar select-none">
            <button
              onClick={() => setDetailContact(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow-lg">
                  {detailContact.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{detailContact.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {detailContact.title} at <strong className="text-slate-200">{detailContact.company}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEmailComposerContact(detailContact);
                  setIsEmailComposerOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" /> Compose Email
              </button>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6 p-4 bg-[#070a12] border border-slate-800 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                <span className="text-xs font-bold text-indigo-300 mt-0.5 block truncate">✉️ {detailContact.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number</span>
                <span className="text-xs font-bold text-slate-200 mt-0.5 block">📞 {detailContact.phone}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company / Org</span>
                <span className="text-xs font-bold text-white mt-0.5 block">🏢 {detailContact.company}</span>
              </div>
            </div>

            {/* Email History Section */}
            <div className="pt-2">
              <EmailHistorySection
                contactId={detailContact.id}
                recipientEmail={detailContact.email}
                recipientName={detailContact.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0e1322] border border-slate-800 rounded-2xl p-6 shadow-2xl relative select-none">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingContact?.name}
                  placeholder="e.g. abc"
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    defaultValue={editingContact?.company || 'abc enterprises'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Title / Role
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingContact?.title || 'cfo'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingContact?.email || 'abc@gmail.com'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    defaultValue={editingContact?.phone || '7890654312'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingContact ? 'Save Contact' : 'Create Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteContactId)}
        title="Delete Contact"
        message="Are you sure you want to remove this contact from the directory?"
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteContactId(null)}
      />

      {emailComposerContact && (
        <EmailComposerModal
          isOpen={isEmailComposerOpen}
          onClose={() => {
            setIsEmailComposerOpen(false);
            setEmailComposerContact(null);
          }}
          initialRecipient={emailComposerContact.email || ''}
          recipientName={emailComposerContact.name}
          contactId={emailComposerContact.id}
          onEmailSent={(sentEmail) => {
            addToast(
              sentEmail.status === 'SENT' ? 'success' : 'info',
              sentEmail.status === 'SENT' ? 'Email Dispatched' : 'Email Logged',
              `Email "${sentEmail.subject}" recorded in contact communications history.`
            );
          }}
        />
      )}

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
