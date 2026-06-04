"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { OccProvider } from "@/context/OccContext";
import { hydrateAllOccStoresFromPersistence } from "@/lib/occ-stores-hydration";

export function OccProviders({ children }: { children: ReactNode }) {
  const [storesReady, setStoresReady] = useState(false);

  useLayoutEffect(() => {
    hydrateAllOccStoresFromPersistence();
    setStoresReady(true);
  }, []);

  if (!storesReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500"
        aria-busy
        aria-label="Loading operations data"
      />
    );
  }

  return <OccProvider>{children}</OccProvider>;
}
