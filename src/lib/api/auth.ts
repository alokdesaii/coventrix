// Auth API contract. Mocked for now — backend team: replace each body with a fetch()
// to the real endpoint, keeping the signatures and return types.

export type Department =
  | "bd-cbd"
  | "it"
  | "marketing"
  | "legal"
  | "customer-service"
  | "payment"
  | "compliance";

export type LoginRequest = { department: Department; username: string; password: string };
export type LoginResponse = { otpRequired: true; challengeId: string };

export type VerifyOtpRequest = { challengeId: string; otp: string };
export type VerifyOtpResponse = { token: string };

export type ForgotPasswordRequest = { email: string };

export class ApiError extends Error {}

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export async function login(req: LoginRequest): Promise<LoginResponse> {
  await delay();
  if (req.password.length < 4) throw new ApiError("Invalid username or password.");
  return { otpRequired: true, challengeId: "mock-challenge" };
}

export async function verifyOtp(req: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  await delay();
  if (!/^\d{6}$/.test(req.otp)) throw new ApiError("Invalid OTP. Please try again.");
  return { token: "mock-token" };
}

export async function forgotPassword(_req: ForgotPasswordRequest): Promise<void> {
  await delay();
}
