"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useOcc } from "@/context/OccContext";
import { canAccessCommandMap } from "@/lib/access-control";
import { ShieldAlert } from "lucide-react";

type CommandMapGuardProps = {
  children: ReactNode;
};

export function CommandMapGuard({ children }: CommandMapGuardProps) {
  const router = useRouter();
  const { session } = useOcc();
  const { currentUser } = session;
  const [apiAllowed, setApiAllowed] = useState<boolean | null>(null);

  const roleAllowed =
    currentUser !== null && canAccessCommandMap(currentUser.role);

  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessCommandMap(currentUser.role)) {
      router.replace("/?access=denied");
      return;
    }

    let cancelled = false;
    fetch("/api/command-map")
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) {
          router.replace("/?access=denied");
          setApiAllowed(false);
          return;
        }
        setApiAllowed(true);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace("/?access=denied");
          setApiAllowed(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, router]);

  if (!roleAllowed || apiAllowed === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="size-12 text-amber-400" aria-hidden />
        <div>
          <h1 className="text-xl font-bold text-slate-100">Access denied</h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Command Map is restricted to Admin and Supervisor roles. Contact your
            OCC administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  if (apiAllowed !== true) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Verifying command map access…
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>;
}
