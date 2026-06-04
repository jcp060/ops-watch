"use client";

import { useState } from "react";
import { EntityStatusBadge } from "@/components/EntityStatusBadge";
import { DeleteUserModal } from "@/components/settings/DeleteUserModal";
import {
  UserFormModal,
  emptyUserForm,
  userToForm,
  type UserFormValues,
} from "@/components/settings/UserFormModal";
import { formatLastLogin } from "@/lib/format";
import { createUniqueId } from "@/lib/unique-id";
import type { OccUser } from "@/lib/types";

type UsersSettingsTabProps = {
  users: OccUser[];
  now: number;
  onSaveUser: (user: OccUser, mode: "create" | "edit") => void;
  onDeleteUser: (id: string) => void;
};

export function UsersSettingsTab({
  users,
  now,
  onSaveUser,
  onDeleteUser,
}: UsersSettingsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyUserForm());
  const [deleteTarget, setDeleteTarget] = useState<OccUser | null>(null);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyUserForm());
    setModalOpen(true);
  };

  const openEdit = (user: OccUser) => {
    setModalMode("edit");
    setEditingId(user.id);
    setForm(userToForm(user));
    setModalOpen(true);
  };

  const handleSubmit = () => {
    const id = editingId ?? createUniqueId();
    const user: OccUser = {
      id,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: modalMode === "create" ? "Active" : form.status,
      lastLoginAt:
        modalMode === "create"
          ? null
          : users.find((u) => u.id === id)?.lastLoginAt ?? null,
    };
    onSaveUser(user, modalMode);
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteUser(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Users</h2>
          <p className="text-sm text-slate-500">
            Manage operators, supervisors, and administrators.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          + Create User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold sm:px-6">Name</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Email</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Role</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Last Login</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-4 font-medium text-slate-200 sm:px-6">
                    {user.name}
                  </td>
                  <td className="px-4 py-4 text-slate-400 sm:px-6">{user.email}</td>
                  <td className="px-4 py-4 sm:px-6">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <EntityStatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-400 sm:px-6">
                    {formatLastLogin(user.lastLoginAt, now)}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => openEdit(user)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={modalOpen}
        mode={modalMode}
        values={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
      />

      <DeleteUserModal
        isOpen={deleteTarget !== null}
        userName={deleteTarget?.name ?? ""}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const styles =
    variant === "danger"
      ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
      : "border-slate-600 text-slate-300 hover:bg-slate-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${styles}`}
    >
      {children}
    </button>
  );
}
