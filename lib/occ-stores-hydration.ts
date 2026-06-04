import { hydrateAircraftStoreFromPersistence } from "@/stores/aircraft-store";
import { hydrateArchiveStoreFromPersistence } from "@/stores/archive-store";
import { hydrateIncidentReportsStoreFromPersistence } from "@/stores/incident-reports-store";
import { hydrateResponsePlansStoreFromPersistence } from "@/stores/response-plans-store";
import { hydrateOrganizationsStoreFromPersistence } from "@/stores/organizations-store";
import { hydrateUsersStoreFromPersistence } from "@/stores/users-store";

/** Load persisted OCC stores from localStorage (client only). */
export function hydrateAllOccStoresFromPersistence(): void {
  hydrateOrganizationsStoreFromPersistence();
  hydrateAircraftStoreFromPersistence();
  hydrateUsersStoreFromPersistence();
  hydrateArchiveStoreFromPersistence();
  hydrateIncidentReportsStoreFromPersistence();
  hydrateResponsePlansStoreFromPersistence();
}
