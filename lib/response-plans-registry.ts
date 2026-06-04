import type { OrganizationResponsePlan } from "./types";

export function cloneOrganizationResponsePlan(
  plan: OrganizationResponsePlan,
): OrganizationResponsePlan {
  return {
    ...plan,
    versions: plan.versions.map((version) => ({
      ...version,
      steps: version.steps.map((step) => ({
        ...step,
        items: step.items.map((item) => ({
          ...item,
          options: item.options?.slice(),
        })),
      })),
      overrides: {
        notificationContacts: version.overrides.notificationContacts.map(
          (contact) => ({ ...contact }),
        ),
        requiredInformation: { ...version.overrides.requiredInformation },
      },
    })),
  };
}

export function upsertOrganizationResponsePlan(
  registry: OrganizationResponsePlan[],
  plan: OrganizationResponsePlan,
): OrganizationResponsePlan[] {
  const next = cloneOrganizationResponsePlan(plan);
  const index = registry.findIndex((entry) => entry.id === next.id);
  if (index === -1) return [next, ...registry];
  return registry.map((entry) => (entry.id === next.id ? next : entry));
}

export function findResponsePlanByOrganizationId(
  registry: OrganizationResponsePlan[],
  organizationId: string,
): OrganizationResponsePlan | undefined {
  return registry.find((plan) => plan.organizationId === organizationId);
}

export function deleteResponsePlansForOrganization(
  registry: OrganizationResponsePlan[],
  organizationId: string,
): OrganizationResponsePlan[] {
  return registry.filter((plan) => plan.organizationId !== organizationId);
}
