"use client";

import { useOcc } from "@/context/OccContext";
import { canAccessCommandMap } from "@/lib/access-control";

export function SessionRoleBadge() {
  const { session, users } = useOcc();
  const { currentUser, setCurrentUserId } = session;

  if (!currentUser) {
    return (
      <span className="text-xs text-slate-500">No active session user</span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="uppercase tracking-wide">Signed in</span>
      <select
        value={currentUser.id}
        onChange={(event) => setCurrentUserId(event.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
        aria-label="Current session user"
      >
        {users.users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      {canAccessCommandMap(currentUser.role) ? (
        <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
          Command
        </span>
      ) : null}
    </label>
  );
}
