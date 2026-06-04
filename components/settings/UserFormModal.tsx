"use client";

import { FormDialog } from "@/components/FormDialog";
import type { EntityStatus, OccUser, UserRole } from "@/lib/types";
import { USER_ROLES } from "@/lib/types";

export type UserFormValues = {
  name: string;
  email: string;
  role: UserRole;
  status: EntityStatus;
};

type UserFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  values: UserFormValues;
  onChange: (values: UserFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function UserFormModal({
  isOpen,
  mode,
  values,
  onChange,
  onSubmit,
  onClose,
}: UserFormModalProps) {
  const update = (patch: Partial<UserFormValues>) =>
    onChange({ ...values, ...patch });

  return (
    <FormDialog
      title={mode === "create" ? "Create User" : "Edit User"}
      subtitle="Manage OCC system access and role assignment."
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "create" ? "Create User" : "Save Changes"}
    >
      <Field label="Name" id="user-name">
        <input
          id="user-name"
          required
          value={values.name}
          onChange={(e) => update({ name: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Email" id="user-email">
        <input
          id="user-email"
          type="email"
          required
          value={values.email}
          onChange={(e) => update({ email: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Role" id="user-role">
        <select
          id="user-role"
          value={values.role}
          onChange={(e) => update({ role: e.target.value as UserRole })}
          className={inputClass}
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </Field>
      {mode === "edit" && (
        <Field label="Status" id="user-status">
          <select
            id="user-status"
            value={values.status}
            onChange={(e) => update({ status: e.target.value as EntityStatus })}
            className={inputClass}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>
      )}
    </FormDialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30";

export const emptyUserForm = (): UserFormValues => ({
  name: "",
  email: "",
  role: "OCC Operator",
  status: "Active",
});

export function userToForm(user: OccUser): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}
