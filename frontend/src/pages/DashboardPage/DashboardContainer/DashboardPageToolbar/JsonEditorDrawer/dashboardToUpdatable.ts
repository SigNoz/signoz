import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesDashboardSpecDTO,
	DashboardtypesUpdatableDashboardV2DTO,
	TagtypesPostableTagDTO,
} from 'api/generated/services/sigNoz.schemas';

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
