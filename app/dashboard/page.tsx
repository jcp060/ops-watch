export default function DashboardPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
          OPS Watch
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
          Welcome to Ops Watch Dashboard
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          You have passed the sign-in gate. Operational views will be linked here
          next.
        </p>
      </div>
    </main>
  );
}
