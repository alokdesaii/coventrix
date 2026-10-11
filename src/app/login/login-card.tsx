"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, forgotPassword, login, verifyOtp, type Department } from "@/lib/api/auth";

type Step = "credentials" | "otp" | "forgot" | "forgot-sent";

const input =
  "h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-slate outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30";
const primary =
  "h-10 w-full rounded-md bg-teal text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const link = "text-xs font-medium text-white/80 underline-offset-4 hover:text-white hover:underline";

export function LoginForm({ department, onBack }: { department: Department; onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const go = (s: Step) => {
    setError("");
    setStep(s);
  };

  return (
    <div className="flex h-full flex-col justify-center gap-4 p-5">
      {step === "credentials" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await login({ department, username, password });
              setChallengeId(res.challengeId);
              go("otp");
            });
          }}
        >
          <h3 className="mb-1 text-center text-xl font-semibold text-white">Login</h3>
          <input className={input} placeholder="Username" autoComplete="username" autoFocus
            value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Username" />
          <input className={input} type="password" placeholder="Password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
          <button type="button" className={`${link} -mt-1 self-end`} onClick={() => go("forgot")}>
            Forgot password?
          </button>
          <button className={primary} disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await verifyOtp({ challengeId, otp });
              // ponytail: every department lands on the BD dashboard until other portals are cloned
              router.push("/bd/dashboard");
            });
          }}
        >
          <h3 className="text-center text-xl font-semibold text-white">Verify OTP</h3>
          <p className="text-center text-xs leading-relaxed text-white/70">
            Please enter the OTP received on your registered email address.
          </p>
          <input className={`${input} text-center tracking-[0.5em]`} inputMode="numeric" maxLength={6}
            autoComplete="one-time-code" autoFocus placeholder="••••••" aria-label="One-time password"
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
          <button className={primary} disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify"}
          </button>
        </form>
      )}

      {step === "forgot" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await forgotPassword({ email });
              go("forgot-sent");
            });
          }}
        >
          <h3 className="text-center text-xl font-semibold text-white">Reset password</h3>
          <input className={input} type="email" placeholder="Email address" autoComplete="email" autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
          <button className={primary} disabled={busy || !email}>
            {busy ? "Submitting…" : "Submit"}
          </button>
          <button type="button" className={`${link} self-center`} onClick={() => go("credentials")}>
            Back to Login
          </button>
        </form>
      )}

      {step === "forgot-sent" && (
        <div className="flex flex-col gap-3 text-center">
          <h3 className="text-xl font-semibold text-white">Check your email</h3>
          <p className="text-xs leading-relaxed text-white/70">
            If an account exists for {email}, you will receive reset instructions shortly.
          </p>
          <button type="button" className={link} onClick={() => go("credentials")}>Back to Login</button>
        </div>
      )}

      {error && <p role="alert" className="text-center text-xs text-red-300">{error}</p>}

      {step !== "forgot" && step !== "forgot-sent" && (
        <button type="button" className={`${link} self-center`} onClick={onBack}>Back</button>
      )}
    </div>
  );
}
