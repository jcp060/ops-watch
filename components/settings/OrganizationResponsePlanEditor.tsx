"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useResponsePlansRegistry } from "@/hooks/use-response-plans";
import {
  RESPONSE_PLAN_TEMPLATES,
  buildPlanVersionFromTemplate,
  getResponsePlanTemplate,
} from "@/lib/response-plan-templates";
import { getCurrentPlanVersion } from "@/lib/response-plan-execution";
import { formatDateTime } from "@/lib/format";
import {
  formatEmergencyPhoneDisplay,
  formatPhoneInputMask,
  normalizeEmergencyPhone,
} from "@/lib/emergency-contact";
import { createNotificationContact } from "@/lib/response-plan-notifications";
import { createUniqueId } from "@/lib/unique-id";
import type {
  OccUser,
  Organization,
  OrganizationResponsePlanVersion,
  ResponsePlanChecklistItem,
  ResponsePlanStep,
  ResponsePlanTemplateId,
} from "@/lib/types";
import { RESPONSE_PLAN_REQUIRED_INFO_FIELDS } from "@/lib/types";
import {
  getOrCreateResponsePlanForOrganization,
  publishResponsePlanDraftInStore,
} from "@/stores/response-plans-store";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500";

export type ResponsePlanEditorHandle = {
  save: () => boolean;
  discard: () => void;
  isDirty: () => boolean;
};

type OrganizationResponsePlanEditorProps = {
  organization: Organization;
  canEdit: boolean;
  currentUser: OccUser | null;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  onSaved?: () => void;
};

function planVersionsEqual(
  a: OrganizationResponsePlanVersion,
  b: OrganizationResponsePlanVersion,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const OrganizationResponsePlanEditor = forwardRef<
  ResponsePlanEditorHandle,
  OrganizationResponsePlanEditorProps
>(function OrganizationResponsePlanEditor(
  {
    organization,
    canEdit,
    currentUser,
    onDirtyChange,
    onCancel,
    onSaved,
  },
  ref,
) {
  const plans = useResponsePlansRegistry();
  const plan = useMemo(
    () => plans.find((p) => p.organizationId === organization.id) ?? null,
    [plans, organization.id],
  );
  const currentVersion = plan ? getCurrentPlanVersion(plan) : null;

  const [baseline, setBaseline] = useState<OrganizationResponsePlanVersion>(() =>
    buildPlanVersionFromTemplate(
      "standard-flight-following",
      organization.organizationName,
      {
        id: currentUser?.id ?? "system",
        name: currentUser?.name ?? "System",
      },
    ),
  );
  const [draft, setDraft] = useState<OrganizationResponsePlanVersion | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResponsePlanTemplateId>("standard-flight-following");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const nextBaseline =
      currentVersion ??
      buildPlanVersionFromTemplate(
        "standard-flight-following",
        organization.organizationName,
        {
          id: currentUser?.id ?? "system",
          name: currentUser?.name ?? "System",
        },
      );
    setBaseline(structuredClone(nextBaseline));
    setDraft(null);
    setSaveMessage(null);
    setSaveError(null);
    setSelectedTemplate("standard-flight-following");
  }, [organization.id, currentVersion?.versionNumber, organization.organizationName, currentUser?.id, currentUser?.name]);

  const working = draft ?? baseline;

  const isDirty =
    draft !== null && !planVersionsEqual(draft, baseline);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const applyTemplate = () => {
    if (!canEdit || !currentUser) return;
    const version = buildPlanVersionFromTemplate(
      selectedTemplate,
      organization.organizationName,
      currentUser,
      (plan?.versions.length ?? 0) + 1,
    );
    setDraft(version);
    setSaveMessage(`Template "${getResponsePlanTemplate(selectedTemplate).label}" loaded — save to apply.`);
  };

  const save = (): boolean => {
    if (!canEdit || !currentUser) return false;
    setSaveError(null);
    getOrCreateResponsePlanForOrganization(
      organization.id,
      organization.organizationName,
      currentUser,
    );
    const result = publishResponsePlanDraftInStore(
      organization.id,
      working,
      currentUser,
    );
    if (!result.ok) {
      setSaveError(result.message);
      return false;
    }
    setSaveMessage(`Saved version ${result.plan.currentVersionNumber}.`);
    setDraft(null);
    return true;
  };

  const discard = () => {
    setDraft(null);
    setSaveError(null);
    setSaveMessage(null);
  };

  useImperativeHandle(
    ref,
    () => ({
      save,
      discard,
      isDirty: () => isDirty,
    }),
    [isDirty, working, canEdit, currentUser, organization.id, organization.organizationName],
  );

  const handleSave = () => {
    if (save()) {
      onSaved?.();
    }
  };

  const updateStep = (stepId: string, patch: Partial<ResponsePlanStep>) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      return {
        ...base,
        steps: base.steps.map((step) =>
          step.id === stepId ? { ...step, ...patch } : step,
        ),
      };
    });
  };

  const addStep = () => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      const order = base.steps.length + 1;
      return {
        ...base,
        steps: [
          ...base.steps,
          {
            id: `step-${createUniqueId()}`,
            title: `Step ${order}`,
            order,
            items: [],
          },
        ],
      };
    });
  };

  const removeStep = (stepId: string) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      return {
        ...base,
        steps: base.steps
          .filter((s) => s.id !== stepId)
          .map((s, index) => ({ ...s, order: index + 1 })),
      };
    });
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      const sorted = [...base.steps].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((s) => s.id === stepId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return base;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return {
        ...base,
        steps: sorted.map((s, i) => ({ ...s, order: i + 1 })),
      };
    });
  };

  const addItem = (stepId: string) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      return {
        ...base,
        steps: base.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                items: [
                  ...step.items,
                  {
                    id: `item-${createUniqueId()}`,
                    label: "New checklist item",
                    type: "checkbox" as const,
                    required: true,
                  },
                ],
              }
            : step,
        ),
      };
    });
  };

  const updateItem = (
    stepId: string,
    itemId: string,
    patch: Partial<ResponsePlanChecklistItem>,
  ) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      return {
        ...base,
        steps: base.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                items: step.items.map((item) =>
                  item.id === itemId ? { ...item, ...patch } : item,
                ),
              }
            : step,
        ),
      };
    });
  };

  const removeItem = (stepId: string, itemId: string) => {
    setDraft((current) => {
      const base = current ?? structuredClone(working);
      return {
        ...base,
        steps: base.steps.map((step) =>
          step.id === stepId
            ? { ...step, items: step.items.filter((i) => i.id !== itemId) }
            : step,
        ),
      };
    });
  };

  const sortedSteps = [...working.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 px-4 py-3">
        <p className="text-sm text-violet-100">
          <strong>{working.planName}</strong>
          {plan ? (
            <span className="ml-2 text-violet-300/80">
              · Current version v{plan.currentVersionNumber}
            </span>
          ) : (
            <span className="ml-2 text-violet-300/80">· No published plan yet</span>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Flight followers use this plan during emergencies. Existing incidents keep
          the version active when declared.
        </p>
      </div>

      {!canEdit ? (
        <p className="text-sm text-amber-200/90">
          View only — admins and supervisors may edit organization response plans.
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-slate-400">Start from template</span>
            <select
              className={inputClass}
              value={selectedTemplate}
              onChange={(e) =>
                setSelectedTemplate(e.target.value as ResponsePlanTemplateId)
              }
            >
              {RESPONSE_PLAN_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applyTemplate}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Load template
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {saveMessage ? (
        <p className="text-sm text-emerald-400">{saveMessage}</p>
      ) : null}
      {saveError ? (
        <p className="text-sm text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Plan name</span>
        <input
          className={inputClass}
          disabled={!canEdit}
          value={working.planName}
          onChange={(e) =>
            setDraft((current) => ({
              ...(current ?? structuredClone(working)),
              planName: e.target.value,
            }))
          }
        />
      </label>

      <OverridesEditor
        overrides={working.overrides}
        disabled={!canEdit}
        onChange={(overrides) =>
          setDraft((current) => ({
            ...(current ?? structuredClone(working)),
            overrides,
          }))
        }
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Workflow steps</h3>
          {canEdit ? (
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              <Plus className="size-3.5" aria-hidden />
              Add step
            </button>
          ) : null}
        </div>

        {sortedSteps.map((step, index) => (
          <div
            key={step.id}
            className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-violet-400">Step {index + 1}</span>
              <input
                className={`${inputClass} flex-1`}
                disabled={!canEdit}
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
              />
              {canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => moveStep(step.id, -1)}
                    className="rounded border border-slate-700 p-1.5 text-slate-400 hover:bg-slate-800"
                    aria-label="Move step up"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(step.id, 1)}
                    className="rounded border border-slate-700 p-1.5 text-slate-400 hover:bg-slate-800"
                    aria-label="Move step down"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="rounded border border-red-900/40 p-1.5 text-red-400 hover:bg-red-950/30"
                    aria-label="Delete step"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              ) : null}
            </div>

            <ul className="mt-3 space-y-2">
              {step.items.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 sm:grid-cols-[1fr_auto_auto]"
                >
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={item.label}
                    onChange={(e) =>
                      updateItem(step.id, item.id, { label: e.target.value })
                    }
                  />
                  <select
                    className={inputClass}
                    disabled={!canEdit}
                    value={item.type}
                    onChange={(e) =>
                      updateItem(step.id, item.id, {
                        type: e.target.value as ResponsePlanChecklistItem["type"],
                      })
                    }
                  >
                    <option value="checkbox">Checkbox</option>
                    <option value="yes_no">Yes / No</option>
                    <option value="text">Text</option>
                    <option value="notes">Notes</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={item.required}
                        onChange={(e) =>
                          updateItem(step.id, item.id, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => removeItem(step.id, item.id)}
                        className="text-red-400 hover:text-red-300"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {canEdit ? (
              <button
                type="button"
                onClick={() => addItem(step.id)}
                className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                + Add checklist item
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {plan && plan.versions.length > 0 ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Version history
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {[...plan.versions]
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((version) => (
                <li
                  key={version.versionNumber}
                  className="flex items-center justify-between rounded border border-slate-800 px-3 py-2 text-slate-400"
                >
                  <span>
                    v{version.versionNumber} — {version.planName}
                    {version.versionNumber === plan.currentVersionNumber ? (
                      <span className="ml-2 text-emerald-400">(Current)</span>
                    ) : null}
                  </span>
                  <span className="text-xs">
                    {formatDateTime(version.createdAt)} · {version.createdByUserName}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});

function OverridesEditor({
  overrides,
  disabled,
  onChange,
}: {
  overrides: OrganizationResponsePlanVersion["overrides"];
  disabled: boolean;
  onChange: (overrides: OrganizationResponsePlanVersion["overrides"]) => void;
}) {
  const updateContact = (
    id: string,
    patch: Partial<(typeof overrides.notificationContacts)[number]>,
  ) => {
    onChange({
      ...overrides,
      notificationContacts: overrides.notificationContacts.map((contact) =>
        contact.id === id ? { ...contact, ...patch } : contact,
      ),
    });
  };

  const removeContact = (id: string) => {
    onChange({
      ...overrides,
      notificationContacts: overrides.notificationContacts.filter(
        (contact) => contact.id !== id,
      ),
    });
  };

  const addContact = () => {
    onChange({
      ...overrides,
      notificationContacts: [
        ...overrides.notificationContacts,
        createNotificationContact("New contact"),
      ],
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-800 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Notification requirements
          </h4>
          {!disabled ? (
            <button
              type="button"
              onClick={addContact}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              + Add person
            </button>
          ) : null}
        </div>
        {overrides.notificationContacts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No notification contacts defined.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {overrides.notificationContacts.map((contact) => (
              <li
                key={contact.id}
                className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputClass} min-w-[140px] flex-1`}
                    disabled={disabled}
                    value={contact.label}
                    onChange={(e) =>
                      updateContact(contact.id, { label: e.target.value })
                    }
                    placeholder="Role or position"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={contact.required}
                      onChange={(e) =>
                        updateContact(contact.id, { required: e.target.checked })
                      }
                    />
                    Required
                  </label>
                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="rounded border border-red-900/40 p-1.5 text-red-400 hover:bg-red-950/30"
                      aria-label={`Remove ${contact.label}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <input
                  className={inputClass}
                  disabled={disabled}
                  value={contact.name}
                  onChange={(e) =>
                    updateContact(contact.id, { name: e.target.value })
                  }
                  placeholder="Contact name"
                />
                <input
                  className={inputClass}
                  disabled={disabled}
                  value={
                    contact.phone
                      ? formatPhoneInputMask(contact.phone)
                      : ""
                  }
                  onChange={(e) =>
                    updateContact(contact.id, {
                      phone: normalizeEmergencyPhone(
                        formatPhoneInputMask(e.target.value),
                      ),
                    })
                  }
                  placeholder="Phone number"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-lg border border-slate-800 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Required information
        </h4>
        <ul className="mt-2 space-y-2">
          {RESPONSE_PLAN_REQUIRED_INFO_FIELDS.map(({ key, label }) => (
            <li key={key}>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={overrides.requiredInformation[key]}
                  onChange={(e) =>
                    onChange({
                      ...overrides,
                      requiredInformation: {
                        ...overrides.requiredInformation,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
