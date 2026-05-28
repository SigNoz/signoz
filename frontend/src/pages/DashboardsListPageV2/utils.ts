import type { DashboardtypesGettableDashboardWithPinDTO } from 'api/generated/services/sigNoz.schemas';

export type DashboardListItem = DashboardtypesGettableDashboardWithPinDTO;

export const tagsToStrings = (
	tags: { key: string; value: string }[] | null | undefined,
): string[] =>
	(tags ?? []).map((tag) =>
		tag.key === tag.value ? tag.key : `${tag.key}:${tag.value}`,
	);

// Build a dashboard list filter DSL query from a free-text search input.
// Matches against the user-visible name (spec.display.name) and description.
// Empty input returns undefined so the `query` param is omitted from the API call.
//
// The backend DSL only reserves `name`, `description`, `created_by`, `created_at`,
// `updated_at`, `locked`, `public`, `source`; everything else parses as a tag key
// (e.g. `team = 'pulse'`). There's no "match across any tag value" syntax, and
// `tags.key` / `tags.value` are rejected by the parser, so we stay on name +
// description here. This is the transitional UX — the new UX will expose a DSL
// input and bypass this helper.
export const buildSearchDSL = (search: string): string | undefined => {
	const trimmed = search.trim();
	if (!trimmed) {
		return undefined;
	}
	const escaped = trimmed.replace(/'/g, "''");
	return `name CONTAINS '${escaped}' or description CONTAINS '${escaped}'`;
};
