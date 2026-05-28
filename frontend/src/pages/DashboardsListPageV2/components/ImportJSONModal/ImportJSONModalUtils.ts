import {
	DashboardtypesDashboardSpecDTO,
	DashboardtypesPostableDashboardV2DTO,
	TagtypesPostableTagDTO,
} from 'api/generated/services/sigNoz.schemas';

// Accept either a complete PostableDashboardV2 (flat shape with `spec` and
// top-level `name` / `image` / `tags` / `schemaVersion`) or a bare spec — wrap
// the latter with defaults so users can paste either shape that exists in the
// wild (e.g. testdata/perses.json is a bare spec). The legacy nested
// `{ metadata: { ... }, spec }` shape is also accepted and flattened.
//
// The backend requires `name` (immutable identifier); if the payload doesn't
// carry one, fall back to `generateName: true` so the server assigns one.
export function normalizeToPostable(
	parsed: Record<string, unknown>,
): DashboardtypesPostableDashboardV2DTO {
	const hasSpec = 'spec' in parsed;
	const legacyMeta = parsed.metadata as
		| {
				schemaVersion?: string;
				name?: string;
				image?: string;
				tags?: TagtypesPostableTagDTO[] | null;
		  }
		| undefined;

	const resolvedName = (parsed.name as string | undefined) ?? legacyMeta?.name;

	if (hasSpec) {
		return {
			schemaVersion:
				(parsed.schemaVersion as string) || legacyMeta?.schemaVersion || 'v6',
			...(resolvedName ? { name: resolvedName } : { generateName: true }),
			image: (parsed.image as string) ?? legacyMeta?.image,
			tags:
				(parsed.tags as TagtypesPostableTagDTO[] | null) ??
				legacyMeta?.tags ??
				null,
			spec: parsed.spec as DashboardtypesDashboardSpecDTO,
		};
	}

	return {
		schemaVersion: 'v6',
		generateName: true,
		tags: null,
		spec: parsed as unknown as DashboardtypesDashboardSpecDTO,
	};
}
