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

export const usersApi = {
  getMe: () =>
    apiClient.get('/users/me'),

  updateMe: (data: { name?: string; timezone?: string }) =>
    apiClient.put('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/users/me/password', data),
};
