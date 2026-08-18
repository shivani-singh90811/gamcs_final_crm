import { UserRole } from '../types';

export type CanonicalRole = 'ROLE_SUPER_ADMIN' | 'ROLE_ADMIN' | 'ROLE_EMPLOYEE' | 'ROLE_CLIENT';

export interface RoleDefinition {
  code: CanonicalRole;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  bgBadge: string;
  borderColor: string;
  iconName: 'Crown' | 'Shield' | 'Briefcase' | 'Building2';
  description: string;
  allowedRoutes: string[];
  permissions: string[];
}

export type PermissionKey =
  | 'VIEW_ALL_LEADS'
  | 'EDIT_LEADS'
  | 'DELETE_LEADS'
  | 'VIEW_CLIENTS'
  | 'EDIT_CLIENTS'
  | 'MANAGE_PROJECTS'
  | 'MANAGE_TASKS'
  | 'CREATE_INVOICES'
  | 'APPROVE_INVOICES'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'SYSTEM_SETTINGS'
  | 'DATABASE_BACKUP'
  | 'ACCESS_CLIENT_PORTAL'
  | 'ADD_REMARKS'
  | 'MANAGE_REMARKS';

/**
 * Normalizes any legacy or custom role code to one of the 4 canonical roles.
 */
export const normalizeRole = (role?: string | null): CanonicalRole => {
  if (!role) return 'ROLE_EMPLOYEE';
  const r = role.toUpperCase();

  if (
    r === 'ROLE_SUPER_ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'ROLE_PARTNER' ||
    r === 'PARTNER' ||
    r === 'OWNER'
  ) {
    return 'ROLE_SUPER_ADMIN';
  }

  if (
    r === 'ROLE_ADMIN' ||
    r === 'ADMIN' ||
    r === 'ROLE_SENIOR_CONSULTANT' ||
    r === 'SENIOR_CONSULTANT' ||
    r === 'MANAGER'
  ) {
    return 'ROLE_ADMIN';
  }

  if (
    r === 'ROLE_CLIENT' ||
    r === 'CLIENT' ||
    r === 'ROLE_CLIENT_PORTAL' ||
    r === 'CLIENT_PORTAL'
  ) {
    return 'ROLE_CLIENT';
  }

  return 'ROLE_EMPLOYEE';
};

/**
 * Detailed configuration and rules for each of the 4 Enterprise Roles.
 */
export const ROLE_DEFINITIONS: Record<CanonicalRole, RoleDefinition> = {
  ROLE_SUPER_ADMIN: {
    code: 'ROLE_SUPER_ADMIN',
    title: 'Super Admin',
    subtitle: 'Full System Access & Governance',
    badge: 'Super Admin',
    color: 'text-indigo-400',
    bgBadge: 'bg-indigo-950/90 text-indigo-300 border-indigo-700/80',
    borderColor: 'border-indigo-600',
    iconName: 'Crown',
    description: 'Full system access. Manage users, clients, leads, projects, invoices and reports. Assign and reassign tasks. View every employee\'s work. Access analytics and company settings.',
    allowedRoutes: [
      '/dashboard', '/manager-dashboard', '/leads', '/contacts', '/clients', '/meetings', '/projects',
      '/tasks', '/proposals', '/invoices', '/documents', '/reports', '/users',
      '/roles', '/timeline', '/notifications', '/settings', '/client-portal'
    ],
    permissions: [
      'VIEW_ALL_LEADS', 'EDIT_LEADS', 'DELETE_LEADS', 'VIEW_CLIENTS', 'EDIT_CLIENTS',
      'MANAGE_PROJECTS', 'MANAGE_TASKS', 'CREATE_INVOICES', 'APPROVE_INVOICES',
      'VIEW_FINANCIAL_REPORTS', 'MANAGE_USERS', 'MANAGE_ROLES', 'SYSTEM_SETTINGS',
      'DATABASE_BACKUP', 'ACCESS_CLIENT_PORTAL', 'ADD_REMARKS', 'MANAGE_REMARKS'
    ],
  },
  ROLE_ADMIN: {
    code: 'ROLE_ADMIN',
    title: 'Manager',
    subtitle: 'Team Leadership & Performance Tracking',
    badge: 'Manager',
    color: 'text-purple-400',
    bgBadge: 'bg-purple-950/90 text-purple-300 border-purple-700/80',
    borderColor: 'border-purple-600',
    iconName: 'Shield',
    description: 'Manage assigned teams. Assign leads and tasks. Approve proposals. Track employee performance. View team reports.',
    allowedRoutes: [
      '/dashboard', '/manager-dashboard', '/leads', '/contacts', '/clients', '/meetings', '/projects',
      '/tasks', '/proposals', '/invoices', '/documents', '/reports', '/timeline',
      '/notifications'
    ],
    permissions: [
      'VIEW_ALL_LEADS', 'EDIT_LEADS', 'VIEW_CLIENTS', 'EDIT_CLIENTS',
      'MANAGE_PROJECTS', 'MANAGE_TASKS', 'CREATE_INVOICES', 'APPROVE_INVOICES',
      'VIEW_FINANCIAL_REPORTS', 'ADD_REMARKS', 'MANAGE_REMARKS'
    ],
  },
  ROLE_EMPLOYEE: {
    code: 'ROLE_EMPLOYEE',
    title: 'Employee',
    subtitle: 'Assigned Work Execution',
    badge: 'Employee',
    color: 'text-emerald-400',
    bgBadge: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80',
    borderColor: 'border-emerald-600',
    iconName: 'Briefcase',
    description: 'Access only assigned leads, projects and tasks. Update task status. Schedule meetings. Upload documents. Generate proposals for assigned clients. Cannot access other employees\' data.',
    allowedRoutes: [
      '/dashboard', '/contacts', '/clients', '/meetings', '/projects',
      '/tasks', '/proposals', '/documents', '/timeline', '/notifications'
    ],
    permissions: [
      'VIEW_ASSIGNED_PROJECTS', 'VIEW_ASSIGNED_TASKS', 'UPDATE_TASK_PROGRESS',
      'UPLOAD_DOCUMENTS', 'VIEW_ASSIGNED_MEETINGS', 'VIEW_ASSIGNED_CLIENTS', 'ADD_REMARKS'
    ],
  },
  ROLE_CLIENT: {
    code: 'ROLE_CLIENT',
    title: 'Client',
    subtitle: 'Client Portal Access',
    badge: 'Client',
    color: 'text-amber-400',
    bgBadge: 'bg-amber-950/90 text-amber-300 border-amber-700/80',
    borderColor: 'border-amber-600',
    iconName: 'Building2',
    description: 'View only their own projects, invoices and documents. Track project progress. Download shared files.',
    allowedRoutes: [
      '/client-portal', '/dashboard', '/projects', '/invoices', '/documents', '/meetings', '/contacts', '/notifications'
    ],
    permissions: [
      'ACCESS_CLIENT_PORTAL', 'VIEW_OWN_PROJECTS', 'VIEW_INVOICES',
      'VIEW_DOCUMENTS', 'VIEW_PROJECT_PROGRESS', 'DOWNLOAD_REPORTS', 'SEND_MESSAGES', 'ADD_REMARKS'
    ],
  },
};

/**
 * Check if a given role has permission to access a specific feature/action.
 */
export const hasPermission = (userRole: string | undefined | null, permission: PermissionKey): boolean => {
  const canonical = normalizeRole(userRole);
  const def = ROLE_DEFINITIONS[canonical];
  return def.permissions.includes(permission);
};

/**
 * Check if a given role can navigate to a given route.
 */
export const canAccessRoute = (userRole: string | undefined | null, routePath: string): boolean => {
  const canonical = normalizeRole(userRole);
  const def = ROLE_DEFINITIONS[canonical];
  // Normalize path string
  const cleanPath = routePath.split('?')[0];
  return def.allowedRoutes.some((r) => cleanPath.startsWith(r));
};

/**
 * Retrieve full role definition object for a role string.
 */
export const getRoleDefinition = (userRole?: string | null): RoleDefinition => {
  const canonical = normalizeRole(userRole);
  return ROLE_DEFINITIONS[canonical];
};
