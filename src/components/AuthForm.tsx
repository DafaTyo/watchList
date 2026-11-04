"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Film, Lock, Mail, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "login" | "register";
  allowRegistration: boolean;
};

export function AuthForm({ mode, allowRegistration }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail) {
      setError("Email wajib diisi.");
      return;
    }

    if (mode === "register" && !trimmedName) {
      setError("Nama wajib diisi.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password harus terdiri dari 8 hingga 128 karakter.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await authClient.signIn.email({
          email: normalizedEmail,
          password,
        });
        if (res.error) {
          if (res.error.status === 429) {
            setError("Terlalu banyak percobaan masuk. Silakan tunggu sebentar lalu coba lagi.");
          } else {
            setError("Email atau password salah.");
          }
          setLoading(false);
          return;
        }
      } else {
        if (!allowRegistration) {
          setError("Pendaftaran akun baru sedang ditutup.");
          setLoading(false);
          return;
        }
        const res = await authClient.signUp.email({
          name: trimmedName,
          email: normalizedEmail,
          password,
        });
        if (res.error) {
          if (res.error.status === 429) {
            setError("Terlalu banyak percobaan pendaftaran. Silakan tunggu sebentar.");
          } else {
            setError(
              res.error.message || "Gagal mendaftar. Email mungkin sudah terdaftar atau pendaftaran ditutup."
            );
          }
          setLoading(false);
          return;
        }
      }

      router.push("/watchlist");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface rounded-panel shadow-card p-6 sm:p-8 border border-line">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-icon bg-ink text-surface flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">
              Nixtio Watch
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-ink">
              {mode === "login" ? "Masuk Akun" : "Daftar Akun"}
            </h1>
          </div>
        </div>

        {error && (
          <div
            id="auth-form-error"
            role="alert"
            className="mb-5 p-3.5 rounded-input bg-error-bg text-status-dropped-fg text-sm font-medium border border-red-500/20"
          >
            {error}
          </div>
        )}

        {mode === "register" && !allowRegistration ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-4 rounded-input bg-surface-soft text-ink text-sm border border-line"
            >
              Pendaftaran pengguna baru saat ini dinonaktifkan oleh administrator (
              <code className="text-xs">ALLOW_REGISTRATION=false</code>).
            </div>
            <Link
              href="/login"
              className="w-full h-14 rounded-pill bg-cta-gradient text-ink font-semibold text-base flex items-center justify-between px-6 shadow-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition"
            >
              <span>Kembali ke Halaman Masuk</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama panggilan Anda"
                    aria-describedby={error ? "auth-form-error" : undefined}
                    className="w-full h-12 pl-11 pr-4 rounded-input bg-surface-soft text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  aria-describedby={error ? "auth-form-error" : undefined}
                  className="w-full h-12 pl-11 pr-4 rounded-input bg-surface-soft text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  aria-describedby={error ? "auth-form-error" : undefined}
                  className="w-full h-12 pl-11 pr-4 rounded-input bg-surface-soft text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-2 rounded-pill bg-cta-gradient text-ink font-semibold text-base flex items-center justify-between px-6 shadow-card hover:opacity-95 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition"
            >
              <span>
                {loading
                  ? "Memproses..."
                  : mode === "login"
                    ? "Masuk ke Watchlist"
                    : "Buat Akun Baru"}
              </span>
              <span className="w-8 h-8 rounded-pill bg-ink text-surface flex items-center justify-center">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ink-muted">
          {mode === "login" ? (
            allowRegistration ? (
              <p>
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                >
                  Daftar sekarang
                </Link>
              </p>
            ) : (
              <p>Pendaftaran pengguna baru ditutup.</p>
            )
          ) : (
            <p>
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                Masuk di sini
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
