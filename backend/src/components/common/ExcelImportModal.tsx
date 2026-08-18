import React, { useState, useRef } from 'react';
import {
  X, FileSpreadsheet, Upload, Download, Database, RotateCcw,
  CheckCircle2, AlertCircle, FileText, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiService } from '../../services/api';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [isLoading, setIsLoading] = useState(false);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Export Leads (.xlsx)
  const handleExportXLSX = async () => {
    setIsLoading(true);
    try {
      const leads = await apiService.getLeads();
      const exportData = leads.map((l) => ({
        'Company Name': l.companyName || '',
        'Contact Name': l.contactName || '',
        'Contact Email': l.contactEmail || '',
        'Contact Phone': l.contactPhone || '',
        Industry: l.industry || '',
        'Value ($)': l.estimatedValue || 0,
        Stage: l.stage || 'NEW_LEAD',
        Partner: l.assignedPartner || '',
        Notes: l.notes || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Pipeline');
      XLSX.writeFile(
        workbook,
        `GAMCS_CRM_Pipeline_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      setStatusType('success');
      setStatusMessage('Pipeline exported successfully as .xlsx');
    } catch (err) {
      console.error(err);
      setStatusType('error');
      setStatusMessage('Failed to export .xlsx file');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Download Sample Excel Template (.xlsx)
  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      {
        'Company Name': 'Acme Global Corp',
        'Contact Name': 'John Doe',
        'Contact Email': 'johndoe@acme.com',
        'Contact Phone': '555-0199',
        Industry: 'Technology',
        'Value ($)': 150000,
        Stage: 'QUALIFIED',
        Partner: 'Sarah Jenkins',
        Notes: 'Interested in enterprise cloud package',
      },
      {
        'Company Name': 'Zenith Logistics',
        'Contact Name': 'Jane Smith',
        'Contact Email': 'jsmith@zenith.io',
        'Contact Phone': '555-0244',
        Industry: 'Logistics',
        'Value ($)': 85000,
        Stage: 'PROPOSAL_SENT',
        Partner: 'Michael Chen',
        Notes: 'Proposal review scheduled for next week',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Template');
    XLSX.writeFile(workbook, 'GAMCS_CRM_Lead_Import_Template.xlsx');

    setStatusType('info');
    setStatusMessage('Sample template downloaded');
  };

  // 3. Import Excel Leads
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage('Parsing spreadsheet file...');
    setStatusType('info');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonRows.length === 0) {
        setStatusType('error');
        setStatusMessage('The uploaded file contains no data rows.');
        setIsLoading(false);
        return;
      }

      let count = 0;
      for (const row of jsonRows) {
        const companyName =
          row['Company Name'] || row['companyName'] || row['Company'] || 'Imported Company';
        const contactName = row['Contact Name'] || row['contactName'] || row['Contact'] || 'Key Contact';
        const contactEmail = row['Contact Email'] || row['contactEmail'] || row['Email'] || 'lead@imported.com';
        const contactPhone = row['Contact Phone'] || row['contactPhone'] || row['Phone'] || '';
        const industry = row['Industry'] || row['industry'] || 'General';
        const estimatedValue =
          Number(row['Value ($)'] || row['Value'] || row['estimatedValue']) || 50000;
        const stage = row['Stage'] || row['stage'] || 'NEW_LEAD';
        const assignedPartner = row['Partner'] || row['assignedPartner'] || 'Sarah Jenkins';
        const notes = row['Notes'] || row['notes'] || 'Imported via Excel / CSV batch upload';

        await apiService.createLead({
          companyName,
          contactName,
          contactEmail,
          contactPhone,
          industry,
          estimatedValue,
          stage,
          assignedPartner,
          notes,
        });
        count++;
      }

      setStatusType('success');
      setStatusMessage(`Successfully imported ${count} leads!`);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error('Import error:', err);
      setStatusType('error');
      setStatusMessage('Error parsing Excel or CSV file.');
    } finally {
      setIsLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // 4. Backup Full Database (.json)
  const handleBackupDatabase = async () => {
    setIsLoading(true);
    try {
      const [leads, tasks, contacts, projects] = await Promise.all([
        apiService.getLeads(),
        apiService.getTasks(),
        apiService.getContacts(),
        apiService.getProjects(),
      ]);

      const fullData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        leads,
        tasks,
        contacts,
        projects,
      };

      const jsonStr = JSON.stringify(fullData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GAMCS_CRM_Full_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusType('success');
      setStatusMessage('Full database backup downloaded (.json)');
    } catch (err) {
      console.error(err);
      setStatusType('error');
      setStatusMessage('Failed to create database backup');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Restore Full Database from Backup (.json)
  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage('Restoring database from JSON backup...');
    setStatusType('info');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.leads && Array.isArray(parsed.leads)) {
        for (const lead of parsed.leads) {
          await apiService.createLead(lead);
        }
      }

      setStatusType('success');
      setStatusMessage('Database restored successfully!');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error(err);
      setStatusType('error');
      setStatusMessage('Invalid JSON backup file.');
    } finally {
      setIsLoading(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  // 6. Reset or Wipe Data
  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to PERMANENTLY REMOVE all data from the database? This action cannot be undone.')) return;
    setIsLoading(true);
    try {
      await apiService.clearAllData();
      setStatusType('success');
      setStatusMessage('All hardcoded/sample data wiped successfully. Database is now empty.');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setStatusType('error');
      setStatusMessage('Failed to wipe database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToSample = async () => {
    if (!window.confirm('Reset database to default sample leads & tasks?')) return;
    setIsLoading(true);
    try {
      await apiService.createLead({
        companyName: 'Sample Enterprise Corp',
        contactName: 'David Wright',
        contactEmail: 'david@samplecorp.com',
        estimatedValue: 125000,
        stage: 'PROPOSAL_SENT',
        industry: 'Finance',
        assignedPartner: 'Sarah Jenkins',
        notes: 'Restored sample dataset lead',
      });
      setStatusType('success');
      setStatusMessage('Database reset to sample dataset.');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setStatusType('error');
      setStatusMessage('Failed to reset dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative select-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-extrabold text-white tracking-tight">
            Excel & Data Backup
          </h2>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={excelInputRef}
          accept=".xlsx, .xls, .csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          type="file"
          ref={jsonInputRef}
          accept=".json"
          onChange={handleRestoreDatabase}
          className="hidden"
        />

        {/* Status Notification Message if any */}
        {statusMessage && (
          <div
            className={`p-3 mb-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              statusType === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                : statusType === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
            }`}
          >
            {statusType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Section 1: Excel Lead Import & Export Box */}
        <div className="p-4 bg-[#0a1220]/90 border border-emerald-900/50 rounded-2xl mb-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx / .csv) Lead Import & Export</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Import batch leads directly from Excel files or export current pipeline to spreadsheet.
          </p>

          {/* Buttons Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={isLoading}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel Leads</span>
            </button>

            <button
              onClick={handleExportXLSX}
              disabled={isLoading}
              className="py-2.5 px-3 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/80 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leads (.xlsx)</span>
            </button>
          </div>

          {/* Download Sample Link */}
          <div className="text-center pt-1">
            <button
              onClick={handleDownloadSampleTemplate}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download Sample Excel Template</span>
            </button>
          </div>
        </div>

        {/* Section 2: Complete System Backup & Restore (JSON) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 px-1">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Complete System Backup & Restore (JSON)</span>
          </div>

          {/* Backup Row */}
          <div
            onClick={handleBackupDatabase}
            className="p-3 bg-[#0a0e1a] hover:bg-[#12182b] border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2.5 text-slate-200 font-bold">
              <Download className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Backup Full Database (.json)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">All Leads & Tasks</span>
          </div>

          {/* Restore Row */}
          <div
            onClick={() => jsonInputRef.current?.click()}
            className="p-3 bg-[#0a0e1a] hover:bg-[#12182b] border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2.5 text-slate-200 font-bold">
              <Upload className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Restore Full Database from Backup</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Upload JSON</span>
          </div>

          {/* Reset Row */}
          <div
            onClick={handleResetToSample}
            className="p-3 bg-[#180d14]/80 hover:bg-[#20101a] border border-rose-950 hover:border-rose-900 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2.5 text-rose-300 font-bold">
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Reset to Sample Dataset</span>
            </div>
            <span className="text-[10px] text-rose-400/90 font-medium bg-rose-950/60 border border-rose-900/60 px-2 py-0.5 rounded-md">
              Default Dataset
            </span>
          </div>

          {/* Wipe All Data Row */}
          <div
            onClick={handleClearAllData}
            className="p-3 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2.5 text-red-300 font-bold">
              <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
              <span>Wipe / Clear All Database Data</span>
            </div>
            <span className="text-[10px] text-red-300 font-black bg-red-900/80 border border-red-700/80 px-2 py-0.5 rounded-md">
              Empty Database
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
