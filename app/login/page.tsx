"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            OPS Watch
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Operations control center access
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">
                Username
              </span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter username"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter password"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Demo gate only — any credentials will continue to the dashboard.
          </p>
        </form>
      </div>
    </main>
  );
}
