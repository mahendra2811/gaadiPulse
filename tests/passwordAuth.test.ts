import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  accountEmail,
  newPassword,
  passwordPair,
} from "../src/features/auth/passwordSchema";
import { keepsAuthenticatedAuthScreen } from "../src/features/auth/routing";
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({ client: () => ({ auth }) }));
import {
  passwordLogin,
  passwordSignup,
  requestPasswordReset,
  resendSignup,
  setNewPassword,
  verifyAccountCode,
} from "../src/features/auth/passwordApi";

beforeEach(() => {
  vi.resetAllMocks();
});
describe("password account boundaries", () => {
  it("normalizes email and validates a matching password without changing its contents", () => {
    expect(accountEmail.parse(" user@example.com ")).toBe("user@example.com");
    expect(newPassword.safeParse("short").success).toBe(false);
    expect(
      passwordPair.safeParse({
        password: "a long passphrase",
        confirm: "a different phrase",
      }).success,
    ).toBe(false);
    expect(newPassword.parse(" leading and trailing ")).toBe(
      " leading and trailing ",
    );
  });
  it("allows existing short passwords at login while enforcing policy on new passwords", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await passwordLogin(" user@example.com ", "legacy");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "legacy",
    });
    await expect(
      passwordSignup("user@example.com", "legacy"),
    ).rejects.toThrow();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("does not claim sign-up completed before email verification", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await passwordSignup("user@example.com", "a long passphrase")).toBe(
      false,
    );
    auth.resend.mockResolvedValue({ error: null });
    await resendSignup("user@example.com");
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
    });
  });
  it("uses the recovery verification type and rejects missing or expired sessions", async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { session: { access_token: "fixture" } },
      error: null,
    });
    await verifyAccountCode("user@example.com", "123456", "recovery");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      token: "123456",
      type: "recovery",
    });
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(
      verifyAccountCode("user@example.com", "123456", "signup"),
    ).rejects.toThrow();
    auth.verifyOtp.mockResolvedValue({ error: new Error("Token expired") });
    await expect(
      verifyAccountCode("user@example.com", "123456", "recovery"),
    ).rejects.toThrow("Token expired");
  });
  it("never updates passwords when verification fails and surfaces provider errors", async () => {
    auth.verifyOtp.mockResolvedValue({ error: new Error("Invalid code") });
    await expect(
      verifyAccountCode("user@example.com", "123456", "recovery"),
    ).rejects.toThrow();
    expect(auth.updateUser).not.toHaveBeenCalled();
    auth.resetPasswordForEmail.mockResolvedValue({
      error: new Error("Email rate limit"),
    });
    await expect(requestPasswordReset("user@example.com")).rejects.toThrow(
      "Email rate limit",
    );
    auth.updateUser.mockResolvedValue({ error: null });
    await setNewPassword("a new long passphrase");
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "a new long passphrase",
    });
  });
  it("keeps recovery open after its OTP creates an authenticated session", () => {
    expect(keepsAuthenticatedAuthScreen("/auth/reset-password")).toBe(true);
    expect(keepsAuthenticatedAuthScreen("/auth/password")).toBe(false);
    expect(keepsAuthenticatedAuthScreen("/auth/signup")).toBe(false);
  });
});
