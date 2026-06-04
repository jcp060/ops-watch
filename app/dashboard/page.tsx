"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { OccAppShell } from "@/components/OccAppShell";
import { DashboardStatusCards, DashboardView } from "@/components/DashboardView";

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setAuthReady(true);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!authReady) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <OccAppShell
      showStatusCards
      statusCards={<DashboardStatusCards />}
      headerActions={
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Logout
        </button>
      }
    >
      <DashboardView />
    </OccAppShell>
  );
}
