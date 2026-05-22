import {
	DashboardtypesDashboardSpecDTO,
	DashboardtypesPostableDashboardV2DTO,
	DashboardtypesPostableDashboardV2MetadataDTO,
} from 'api/generated/services/sigNoz.schemas';

// Accept either a complete PostableDashboardV2 (`{ metadata, spec }`) or a
// bare spec — wrap the latter with default metadata so users can paste either
// of the shapes that exist in the wild (e.g. testdata/perses.json is a bare
// spec).
export function normalizeToPostable(
	parsed: Record<string, unknown>,
): DashboardtypesPostableDashboardV2DTO {
	const hasMetadata = 'metadata' in parsed;
	const hasSpec = 'spec' in parsed;
	if (hasMetadata && hasSpec) {
		const meta = parsed.metadata as DashboardtypesPostableDashboardV2MetadataDTO;
		const metadata: DashboardtypesPostableDashboardV2MetadataDTO = {
			...meta,
			schemaVersion: meta?.schemaVersion || 'v6',
		};
		return {
			metadata,
			spec: parsed.spec as DashboardtypesDashboardSpecDTO,
		};
	}

	return {
		metadata: { schemaVersion: 'v6' },
		spec: parsed as unknown as DashboardtypesDashboardSpecDTO,
	};
}
