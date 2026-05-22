import type { DashboardtypesGettableDashboardWithPinDTO } from 'api/generated/services/sigNoz.schemas';

export type DashboardListItem = DashboardtypesGettableDashboardWithPinDTO;

export const tagsToStrings = (
	tags: { key: string; value: string }[] | null | undefined,
): string[] =>
	(tags ?? []).map((tag) =>
		tag.key === tag.value ? tag.key : `${tag.key}:${tag.value}`,
	);

// Build a dashboard list filter DSL query from a free-text search input.
// Matches against name, description, and tags; empty input returns undefined so the
// `query` param is omitted from the API call.
// This is only for the old UX that uses v2. The new UX will actually have DSL search input,
// so it will pass the DSL directly and not use this function.
export const buildSearchDSL = (search: string): string | undefined => {
	const trimmed = search.trim();
	if (!trimmed) {
		return undefined;
	}
	const escaped = trimmed.replace(/'/g, "''");
	return `name CONTAINS '${escaped}' or description CONTAINS '${escaped}' or tags.key CONTAINS '${escaped}' or tags.value CONTAINS '${escaped}'`;
};
