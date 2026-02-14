import apiClient from '@/lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  orgName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    systemRole?: string;
    organization: {
      id: string;
      name: string;
      plan: string;
    };
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<{ success: boolean; data: any }>('/auth/register', data),

  refreshToken: (refreshToken: string) =>
    apiClient.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken },
    ),

  forgotPassword: (email: string) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/forgot-password', {
      email,
    }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/reset-password', {
      token,
      password,
    }),

  verifyEmail: (token: string) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/verify-email', {
      token,
    }),

  getMe: () =>
    apiClient.get<{ success: boolean; data: any }>('/auth/me'),

  logout: () =>
    apiClient.post('/auth/logout'),

  // OAuth
  googleLogin: (idToken: string) =>
    apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/google', { idToken }),

  githubLogin: (code: string) =>
    apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/github', { code }),

  // 2FA
  setup2fa: () =>
    apiClient.post<{ success: boolean; data: { secret: string; qrCode: string; otpauth: string } }>('/auth/2fa/setup'),

  enable2fa: (token: string) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/2fa/enable', { token }),

  disable2fa: (token: string, password: string) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/2fa/disable', { token, password }),

  verify2fa: (email: string, password: string, token: string) =>
    apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/2fa/verify', { email, password, token }),
};
