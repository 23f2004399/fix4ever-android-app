import { request, requestWithAuth } from './client';

const AUTH = '/auth';

export type User = {
  _id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  refreshToken?: string;
  user: User;
};

export type SignupResponse = LoginResponse;

export type SendOtpResponse = {
  success: boolean;
  message: string;
  data?: { email?: string };
};

export type ProfileResponse = {
  success: boolean;
  user: User;
};

/** Send OTP for signup (email must not already be registered). */
export async function sendSignupOtp(email: string) {
  return request<SendOtpResponse>(`${AUTH}/send-otp`, {
    method: 'POST',
    body: { email },
    headers: {
    'Content-Type': 'application/json',
  }
  });
}

/** Send OTP for login (user must exist). */
export async function sendLoginOtp(email: string) {
  return request<SendOtpResponse>(`${AUTH}/login/send-otp`, {
    method: 'POST',
    body: { email },
    headers: {
    'Content-Type': 'application/json',
  }
  });
}

/** Sign up: username, email, phone, password, otp. */
export async function signup(params: {
  username: string;
  email: string;
  phone: string;
  password: string;
  otp: string;
}) {
  return request<SignupResponse>(`${AUTH}/signup`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/** Login: email, password, otp. */
export async function login(params: {
  email: string;
  password: string;
  otp: string;
}) {
  return request<LoginResponse>(`${AUTH}/login`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/** Logout (clears server cookie; client should clear token). */
export async function logout() {
  return request<{ success: boolean; message: string }>(`${AUTH}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/** Forgot password – send OTP to email. Backend: POST /forgot-password { email }. */
export async function forgotPassword(email: string) {
  return request<{ success: boolean; message: string }>(
    `${AUTH}/forgot-password`,
    {
      method: 'POST',
      body: { email },
      headers: {
        'Content-Type': 'application/json',
  }
    }
  );
}

/** Reset password – verify OTP and set new password. Backend: POST /reset-password { email, otp, newPassword }. */
export async function resetPassword(params: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  return request<{ success: boolean; message: string }>(
    `${AUTH}/reset-password`,
    {
      method: 'POST',
      body: params,
      headers: {
      'Content-Type': 'application/json',
  }
    }
  );
}

/** Fetch authenticated profile using a JWT token (from cookie or OAuth). */
export async function fetchProfileWithToken(token: string) {
  return requestWithAuth<ProfileResponse>(`${AUTH}/profile`, token);
}

/** Exchange a refresh token for a new access token. */
export async function refreshAccessToken(refreshToken: string) {
  return request<{ success: boolean; token: string }>(`${AUTH}/refresh-token`, {
    method: 'POST',
    body: { refreshToken },
    headers: { 'Content-Type': 'application/json' },
  });
}

export type GoogleNativeAuthResponse = {
  success: boolean;
  // New user — needs to complete profile
  isNewUser?: boolean;
  prefillName?: string;
  prefillEmail?: string;
  // Authenticated user
  token?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
};

/**
 * Verify a Google idToken from the native mobile SDK.
 * - Call with just idToken first. If response.isNewUser is true, collect phone + username
 *   and call again with all three fields to create the account.
 */
export async function googleNativeAuth(params: {
  idToken: string;
  phone?: string;
  username?: string;
}) {
  return request<GoogleNativeAuthResponse>(`${AUTH}/google/native`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/json' },
  });
}
