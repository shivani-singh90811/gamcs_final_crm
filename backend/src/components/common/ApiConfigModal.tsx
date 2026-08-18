import React, { useState } from 'react';
import { Modal } from './Modal';
import { getStoredConfig, saveConfig } from '../../services/api';
import { Server, Database, Key, CheckCircle2, Code, Terminal, Copy, Globe } from 'lucide-react';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(getStoredConfig());
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'ENDPOINTS' | 'SCHEMA'>('SETTINGS');

  const handleSave = () => {
    saveConfig(config);
    onClose();
    window.location.reload();
  };

  const copyCurl = (endpoint: string) => {
    const curlCmd = `curl -X GET "${config.baseUrl}${endpoint}" \\
  -H "Authorization: Bearer ${config.jwtToken || 'YOUR_JWT_TOKEN'}" \\
  -H "Content-Type: application/json"`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    { method: 'POST', path: '/auth/login', desc: 'Authenticate partner/analyst & return JWT' },
    { method: 'GET', path: '/dashboard/summary', desc: 'Retrieve CFO practice KPIs & billable metrics' },
    { method: 'GET', path: '/leads', desc: 'Fetch consulting pipeline & deal probability' },
    { method: 'GET', path: '/clients', desc: 'Corporate portfolio, retainer fee, & SLA levels' },
    { method: 'GET', path: '/meetings', desc: 'Executive board meetings & strategy schedule' },
    { method: 'GET', path: '/projects', desc: 'Engagements, financial modeling & budget burn' },
    { method: 'GET', path: '/tasks', desc: 'Practitioner tasks & priority matrix' },
    { method: 'GET', path: '/documents', desc: 'Engagement contracts & audit documents' },
    { method: 'GET', path: '/proposals', desc: 'CFO retainer & strategic proposal quotes' },
    { method: 'GET', path: '/invoices', desc: 'Client billing, invoices & payment status' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="REST API & Backend Configuration"
      subtitle="Spring Boot 3 + Java 21 + PostgreSQL REST API Connection Settings"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Navigation tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'SETTINGS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Connection Settings
          </button>
          <button
            onClick={() => setActiveTab('ENDPOINTS')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'ENDPOINTS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Spring Boot REST API List
          </button>
          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'SCHEMA'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            PostgreSQL DB Schema
          </button>
        </div>

        {activeTab === 'SETTINGS' && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm">Spring Boot 3.2 Service Status</h4>
                  <p className="text-xs text-slate-400">
                    Java 21 Enterprise Server | PostgreSQL 16 Node
                  </p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                API Environment Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, useMock: true })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.useMock
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">Interactive REST Engine</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Self-contained mock Spring Boot REST responses with persistent state.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, useMock: false })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !config.useMock
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">Live Spring Boot Backend</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Direct HTTP calls via Axios with JWT Bearer auth to target server.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Spring Boot Base API URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. http://localhost:8080/api/v1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Active JWT Bearer Token
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  readOnly
                  value={config.jwtToken || 'No active JWT token logged in.'}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-mono truncate"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Save & Reload API Client
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ENDPOINTS' && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <p className="text-xs text-slate-500">
              Spring Boot Controllers endpoints mapping. Click copy to copy curl command.
            </p>
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        ep.method === 'POST'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {config.baseUrl}
                      {ep.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{ep.desc}</p>
                </div>
                <button
                  onClick={() => copyCurl(ep.path)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  {copiedEndpoint === ep.path ? (
                    <span className="text-emerald-600 text-[11px] font-bold">Copied!</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'SCHEMA' && (
          <div className="space-y-3">
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-2">
              <div className="text-emerald-400 font-bold">// PostgreSQL Tables Mapping (Spring Data JPA Entities)</div>
              <div>
                CREATE TABLE users (id UUID PRIMARY KEY, name VARCHAR(100), email VARCHAR(150) UNIQUE, role VARCHAR(30));
              </div>
              <div>
                CREATE TABLE clients (id UUID PRIMARY KEY, name VARCHAR(150), retainer NUMERIC(12,2), status VARCHAR(20), sla VARCHAR(20));
              </div>
              <div>
                CREATE TABLE leads (id UUID PRIMARY KEY, company VARCHAR(150), est_value NUMERIC(12,2), stage VARCHAR(30), prob INT);
              </div>
              <div>
                CREATE TABLE projects (id UUID PRIMARY KEY, client_id UUID REFERENCES clients(id), budget NUMERIC(12,2), status VARCHAR(20));
              </div>
              <div>
                CREATE TABLE tasks (id UUID PRIMARY KEY, title VARCHAR(200), priority VARCHAR(20), status VARCHAR(20), assignee VARCHAR(100));
              </div>
              <div>
                CREATE TABLE invoices (id UUID PRIMARY KEY, inv_num VARCHAR(50), total NUMERIC(12,2), status VARCHAR(20), due_date DATE);
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
