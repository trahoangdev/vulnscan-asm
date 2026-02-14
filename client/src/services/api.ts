import apiClient from '@/lib/api';

export const targetsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/targets', { params }),

  create: (data: { type: string; value: string; label?: string; scanProfile?: string; tags?: string[] }) =>
    apiClient.post('/targets', data),

  getById: (id: string) =>
    apiClient.get(`/targets/${id}`),

  update: (id: string, data: Record<string, any>) =>
    apiClient.put(`/targets/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/targets/${id}`),

  verify: (id: string, method: string) =>
    apiClient.post(`/targets/${id}/verify`, { method }),

  skipVerify: (id: string) =>
    apiClient.post(`/targets/${id}/verify/skip`),

  getVerifyStatus: (id: string) =>
    apiClient.get(`/targets/${id}/verify/status`),

  getAssets: (id: string, params?: Record<string, any>) =>
    apiClient.get(`/targets/${id}/assets`, { params }),

  setSchedule: (id: string, data: { scanSchedule: string | null; scanProfile?: string }) =>
    apiClient.put(`/targets/${id}/schedule`, data),
};

export const scansApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/scans', { params }),

  create: (data: { targetId: string; profile?: string; modules?: string[] }) =>
    apiClient.post('/scans', data),

  getById: (id: string) =>
    apiClient.get(`/scans/${id}`),

  cancel: (id: string) =>
    apiClient.post(`/scans/${id}/cancel`),

  getFindings: (id: string, params?: Record<string, any>) =>
    apiClient.get(`/scans/${id}/findings`, { params }),

  getResults: (id: string) =>
    apiClient.get(`/scans/${id}/results`),

  diff: (id: string) =>
    apiClient.get(`/scans/${id}/diff`),
};

export const vulnerabilitiesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/vulnerabilities', { params }),

  getById: (id: string) =>
    apiClient.get(`/vulnerabilities/${id}`),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.put(`/vulnerabilities/${id}/status`, { status, notes }),

  getStats: () =>
    apiClient.get('/vulnerabilities/stats'),

  exportFindings: (params?: Record<string, any>) =>
    apiClient.get('/vulnerabilities/export', { params, responseType: params?.format === 'csv' ? 'blob' : 'json' }),
};

export const notificationsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/notifications', { params }),

  markAsRead: (id: string) =>
    apiClient.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put('/notifications/read-all'),

  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count'),
};

export const dashboardApi = {
  getStats: () =>
    apiClient.get('/dashboard/stats'),
};

export const assetsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/assets', { params }),

  getById: (id: string) =>
    apiClient.get(`/assets/${id}`),

  getStats: () =>
    apiClient.get('/assets/stats'),
};

export const reportsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/reports', { params }),

  generate: (data: { type: string; title: string; format?: string; parameters?: Record<string, any> }) =>
    apiClient.post('/reports', data),

  getById: (id: string) =>
    apiClient.get(`/reports/${id}`),

  download: (id: string) =>
    apiClient.get(`/reports/${id}/download`, { responseType: 'blob' }),

  delete: (id: string) =>
    apiClient.delete(`/reports/${id}`),
};

export const usersApi = {
  getMe: () =>
    apiClient.get('/users/me'),

  updateMe: (data: { name?: string; timezone?: string }) =>
    apiClient.put('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/users/me/password', data),
};

export const organizationsApi = {
  get: () =>
    apiClient.get('/organizations'),

  update: (data: { name?: string; logo?: string | null; billingEmail?: string | null }) =>
    apiClient.put('/organizations', data),

  listMembers: () =>
    apiClient.get('/organizations/members'),

  inviteMember: (data: { email: string; role?: string }) =>
    apiClient.post('/organizations/members', data),

  updateMemberRole: (memberId: string, role: string) =>
    apiClient.put(`/organizations/members/${memberId}`, { role }),

  removeMember: (memberId: string) =>
    apiClient.delete(`/organizations/members/${memberId}`),
};

export const apiKeysApi = {
  list: () =>
    apiClient.get('/api-keys'),

  create: (data: { name: string; permissions?: string[]; expiresInDays?: number }) =>
    apiClient.post('/api-keys', data),

  revoke: (id: string) =>
    apiClient.delete(`/api-keys/${id}`),
};

export const webhooksApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/webhooks', { params }),

  getById: (id: string) =>
    apiClient.get(`/webhooks/${id}`),

  create: (data: { name: string; url: string; secret?: string; events: string[] }) =>
    apiClient.post('/webhooks', data),

  update: (id: string, data: Record<string, any>) =>
    apiClient.put(`/webhooks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/webhooks/${id}`),

  test: (id: string) =>
    apiClient.post(`/webhooks/${id}/test`),
};

// ========================
// ADMIN API
// ========================

export const adminApi = {
  // Dashboard
  getDashboard: () =>
    apiClient.get('/admin/dashboard'),

  // Users
  listUsers: (params?: Record<string, any>) =>
    apiClient.get('/admin/users', { params }),

  getUserById: (id: string) =>
    apiClient.get(`/admin/users/${id}`),

  updateUser: (id: string, data: Record<string, any>) =>
    apiClient.put(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`),

  resetUserPassword: (id: string, newPassword: string) =>
    apiClient.post(`/admin/users/${id}/reset-password`, { newPassword }),

  // Organizations
  listOrgs: (params?: Record<string, any>) =>
    apiClient.get('/admin/organizations', { params }),

  getOrgById: (id: string) =>
    apiClient.get(`/admin/organizations/${id}`),

  updateOrg: (id: string, data: Record<string, any>) =>
    apiClient.put(`/admin/organizations/${id}`, data),

  deleteOrg: (id: string) =>
    apiClient.delete(`/admin/organizations/${id}`),

  // Settings
  getSettings: (category?: string) =>
    apiClient.get('/admin/settings', { params: category ? { category } : undefined }),

  getSetting: (key: string) =>
    apiClient.get(`/admin/settings/${key}`),

  updateSetting: (key: string, value: any, label?: string) =>
    apiClient.put(`/admin/settings/${key}`, { value, label }),

  batchUpdateSettings: (settings: Array<{ key: string; value: any; category?: string; label?: string }>) =>
    apiClient.put('/admin/settings', { settings }),

  // Audit Logs
  listAuditLogs: (params?: Record<string, any>) =>
    apiClient.get('/admin/audit-logs', { params }),

  // Scans
  listScans: (params?: Record<string, any>) =>
    apiClient.get('/admin/scans', { params }),

  cancelScan: (id: string) =>
    apiClient.post(`/admin/scans/${id}/cancel`),
};
