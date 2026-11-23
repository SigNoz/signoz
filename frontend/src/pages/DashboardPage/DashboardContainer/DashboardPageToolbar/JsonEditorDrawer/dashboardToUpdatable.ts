import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesGettableDashboardV2DTO';
import type { DashboardtypesDashboardSpecDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesDashboardSpecDTO';
import type { DashboardtypesUpdatableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesUpdatableDashboardV2DTO';
import type { TagtypesPostableTagDTO } from 'api/generated/services/sigNoz.schemas/tagtypesPostableTagDTO';

/**
 * Narrow a parsed (full Gettable-shaped) dashboard JSON down to the PUT-updatable
 * body. The editor shows the whole dashboard for readability, but the update
 * endpoint only accepts `{ name, schemaVersion, image, tags, spec }` — the
 * server owns `id`, `locked`, timestamps, etc., so we drop them here.
 */
export function dashboardToUpdatable(
	parsed: Record<string, unknown>,
): DashboardtypesUpdatableDashboardV2DTO {
	const dashboard = parsed as Partial<DashboardtypesGettableDashboardV2DTO>;

	return {
		name: dashboard.name ?? '',
		schemaVersion: dashboard.schemaVersion ?? 'v6',
		image: dashboard.image,
		tags: (dashboard.tags as TagtypesPostableTagDTO[] | null | undefined) ?? null,
		spec: dashboard.spec as DashboardtypesDashboardSpecDTO,
	};
}
