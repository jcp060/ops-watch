import { createUniqueId } from "./unique-id";
import { createNotificationContact, defaultNotificationContacts } from "./response-plan-notifications";
import type {
  OrganizationResponsePlanVersion,
  ResponsePlanChecklistItem,
  ResponsePlanOverrides,
  ResponsePlanStep,
  ResponsePlanTemplateId,
} from "./types";

export type ResponsePlanTemplate = {
  id: ResponsePlanTemplateId;
  label: string;
  description: string;
  planNameSuffix: string;
  steps: Omit<ResponsePlanStep, "id">[];
  overrides: ResponsePlanOverrides;
};

const defaultOverrides = (): ResponsePlanOverrides => ({
  notificationContacts: defaultNotificationContacts(),
  requiredInformation: {
    personsOnBoard: true,
    fuelRemaining: false,
    lastKnownCoordinates: true,
    medicalConcerns: false,
    missionType: false,
  },
});

function item(
  label: string,
  type: ResponsePlanChecklistItem["type"] = "checkbox",
  required = true,
  options?: string[],
): Omit<ResponsePlanChecklistItem, "id"> {
  return { label, type, required, options };
}

function stepsFromTemplates(
  defs: { title: string; items: ReturnType<typeof item>[] }[],
): Omit<ResponsePlanStep, "id">[] {
  return defs.map((def, index) => ({
    title: def.title,
    order: index + 1,
    items: def.items.map((entry) => ({
      id: `item-${createUniqueId()}`,
      label: entry.label,
      type: entry.type,
      required: entry.required,
      options: entry.options,
    })),
  }));
}

export const RESPONSE_PLAN_TEMPLATES: ResponsePlanTemplate[] = [
  {
    id: "standard-flight-following",
    label: "Standard Flight Following",
    description: "General aviation flight following emergency procedures.",
    planNameSuffix: "Emergency Response Plan",
    steps: stepsFromTemplates([
      {
        title: "Establish Communications",
        items: [
          item("Attempt radio contact"),
          item("Attempt phone contact"),
          item("Record last known position", "text"),
        ],
      },
      {
        title: "Initial Assessment",
        items: [
          item("Emergency type identified", "dropdown", true, [
            "Mechanical",
            "Medical",
            "Fuel",
            "Weather",
            "Lost Communications",
            "Accident",
            "Unknown",
            "Other",
          ]),
          item("Current aircraft status", "notes"),
        ],
      },
      {
        title: "Response Actions",
        items: [
          item("Emergency services contacted"),
          item("Search and rescue initiated (if applicable)", "checkbox", false),
        ],
      },
      {
        title: "Notifications",
        items: [
          item("Notify organization emergency contact", "yes_no"),
          item("Notify organization dispatch"),
          item("Notify supervisor"),
          item("Additional notifications", "notes", false),
        ],
      },
      {
        title: "Ongoing Monitoring",
        items: [item("Situation update", "notes", false)],
      },
      {
        title: "Event Outcome",
        items: [
          item("Outcome", "dropdown", true, [
            "Safe Landing",
            "Precautionary Landing",
            "Accident",
            "Incident",
            "SAR Activation",
            "Unresolved",
            "Other",
          ]),
          item("Severity", "dropdown", true, [
            "Low",
            "Moderate",
            "High",
            "Critical",
          ]),
          item("Final summary", "notes"),
        ],
      },
    ]),
    overrides: defaultOverrides(),
  },
  {
    id: "ems-helicopter",
    label: "EMS Helicopter Operations",
    description: "Air medical helicopter emergency response workflow.",
    planNameSuffix: "EMS Emergency Response Plan",
    steps: stepsFromTemplates([
      {
        title: "Establish Communications",
        items: [
          item("Contact aircraft crew"),
          item("Contact receiving hospital / EMS dispatch"),
          item("Record last known position", "text"),
        ],
      },
      {
        title: "Medical & Mission Status",
        items: [
          item("Patient status update", "notes"),
          item("Medical concerns documented", "notes"),
          item("Persons on board confirmed", "text"),
        ],
      },
      {
        title: "Escalation",
        items: [
          item("Emergency services contacted"),
          item("Contact local authorities if required"),
          item("Contact FAA if required"),
          item("Initiate SAR procedures if required", "checkbox", false),
        ],
      },
      {
        title: "Notifications",
        items: [
          item("Notify Operations Manager"),
          item("Notify Chief Pilot"),
          item("Notify Emergency Contact"),
          item("Notify receiving facility"),
        ],
      },
    ]),
    overrides: {
      notificationContacts: [
        createNotificationContact("Operations Manager"),
        createNotificationContact("Chief Pilot"),
        createNotificationContact("Safety Officer"),
        createNotificationContact("Customer", false),
        createNotificationContact("FAA", false),
        createNotificationContact("NTSB", false),
        createNotificationContact("SAR"),
      ],
      requiredInformation: {
        personsOnBoard: true,
        fuelRemaining: true,
        lastKnownCoordinates: true,
        medicalConcerns: true,
        missionType: true,
      },
    },
  },
  {
    id: "utility-helicopter",
    label: "Utility Helicopter Operations",
    description: "Utility / construction helicopter emergency procedures.",
    planNameSuffix: "Utility Emergency Response Plan",
    steps: stepsFromTemplates([
      {
        title: "Establish Communications",
        items: [
          item("Attempt radio contact"),
          item("Contact field operations manager"),
          item("Record last known position", "text"),
        ],
      },
      {
        title: "Escalation",
        items: [
          item("Emergency services contacted"),
          item("Contact local authorities"),
          item("Contact utility control center"),
          item("Initiate SAR if over remote terrain", "checkbox", false),
        ],
      },
      {
        title: "Notifications",
        items: [
          item("Notify Operations Manager"),
          item("Notify Chief Pilot"),
          item("Notify site supervisor"),
        ],
      },
    ]),
    overrides: defaultOverrides(),
  },
  {
    id: "law-enforcement",
    label: "Law Enforcement Aviation",
    description: "Public safety aviation emergency response.",
    planNameSuffix: "Law Enforcement Emergency Response Plan",
    steps: stepsFromTemplates([
      {
        title: "Establish Communications",
        items: [
          item("Contact air unit"),
          item("Contact dispatch / command center"),
          item("Record last known position", "text"),
        ],
      },
      {
        title: "Escalation",
        items: [
          item("Emergency services contacted"),
          item("Contact local authorities"),
          item("Contact FAA if required"),
          item("Coordinate mutual aid if required", "checkbox", false),
        ],
      },
      {
        title: "Notifications",
        items: [
          item("Notify aviation unit supervisor"),
          item("Notify agency operations center"),
          item("Notify Emergency Contact"),
        ],
      },
    ]),
    overrides: {
      notificationContacts: [
        createNotificationContact("Operations Manager"),
        createNotificationContact("Chief Pilot"),
        createNotificationContact("Safety Officer", false),
        createNotificationContact("FAA"),
        createNotificationContact("NTSB", false),
        createNotificationContact("SAR", false),
      ],
      requiredInformation: defaultOverrides().requiredInformation,
    },
  },
  {
    id: "offshore",
    label: "Offshore Operations",
    description: "Offshore helicopter / fixed-wing emergency procedures.",
    planNameSuffix: "Offshore Emergency Response Plan",
    steps: stepsFromTemplates([
      {
        title: "Establish Communications",
        items: [
          item("Contact aircraft"),
          item("Contact rig / platform operations"),
          item("Record last known position", "text"),
        ],
      },
      {
        title: "Escalation",
        items: [
          item("Emergency services contacted"),
          item("Contact coast guard / SAR"),
          item("Contact local authorities"),
          item("Activate ditching / survival procedures if applicable", "notes", false),
        ],
      },
      {
        title: "Notifications",
        items: [
          item("Notify Operations Manager"),
          item("Notify offshore coordinator"),
          item("Notify Emergency Contact"),
        ],
      },
    ]),
    overrides: {
      notificationContacts: [
        createNotificationContact("Operations Manager"),
        createNotificationContact("Chief Pilot"),
        createNotificationContact("Safety Officer", false),
        createNotificationContact("Customer", false),
        createNotificationContact("FAA", false),
        createNotificationContact("NTSB", false),
        createNotificationContact("SAR"),
      ],
      requiredInformation: {
        personsOnBoard: true,
        fuelRemaining: true,
        lastKnownCoordinates: true,
        medicalConcerns: true,
        missionType: true,
      },
    },
  },
  {
    id: "custom-blank",
    label: "Custom Blank Template",
    description: "Start with an empty plan and build your own workflow.",
    planNameSuffix: "Emergency Response Plan",
    steps: [
      {
        title: "Step 1",
        order: 1,
        items: [],
      },
    ],
    overrides: defaultOverrides(),
  },
];

export function getResponsePlanTemplate(
  id: ResponsePlanTemplateId,
): ResponsePlanTemplate {
  return (
    RESPONSE_PLAN_TEMPLATES.find((t) => t.id === id) ??
    RESPONSE_PLAN_TEMPLATES[0]
  );
}

export function buildPlanVersionFromTemplate(
  templateId: ResponsePlanTemplateId,
  organizationName: string,
  user: { id: string; name: string },
  versionNumber = 1,
): OrganizationResponsePlanVersion {
  const template = getResponsePlanTemplate(templateId);
  const now = Date.now();
  return {
    versionNumber,
    planName: `${organizationName} ${template.planNameSuffix}`,
    createdAt: now,
    createdByUserId: user.id,
    createdByUserName: user.name,
    steps: template.steps.map((step, index) => ({
      ...step,
      id: `step-${createUniqueId()}`,
      order: index + 1,
      items: step.items.map((entry) => ({
        ...entry,
        id: `item-${createUniqueId()}`,
      })),
    })),
    overrides: structuredClone(template.overrides),
  };
}

export function clonePlanSteps(steps: ResponsePlanStep[]): ResponsePlanStep[] {
  return steps.map((step) => ({
    ...step,
    items: step.items.map((item) => ({ ...item, options: item.options?.slice() })),
  }));
}
