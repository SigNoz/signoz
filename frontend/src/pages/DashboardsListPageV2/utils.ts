import dayjs from 'dayjs';
import { isEmpty } from 'lodash-es';
import type { DashboardtypesGettableDashboardWithPinDTO } from 'api/generated/services/sigNoz.schemas';

export type DashboardListItem = DashboardtypesGettableDashboardWithPinDTO;

export const tagsToStrings = (
	tags: { key: string; value: string }[] | null | undefined,
): string[] =>
	(tags ?? []).map((tag) =>
		tag.key === tag.value ? tag.key : `${tag.key}:${tag.value}`,
	);

export const lastUpdatedLabel = (time: string | undefined): string => {
	if (!time || isEmpty(time)) {
		return 'No updates yet!';
	}
	const diff = dayjs();
	const ref = dayjs(time);
	const months = diff.diff(ref, 'months');
	if (months > 0) {
		return `Last Updated ${months} months ago`;
	}
	const days = diff.diff(ref, 'days');
	if (days > 0) {
		return `Last Updated ${days} days ago`;
	}
	const hours = diff.diff(ref, 'hours');
	if (hours > 0) {
		return `Last Updated ${hours} hrs ago`;
	}
	const minutes = diff.diff(ref, 'minutes');
	if (minutes > 0) {
		return `Last Updated ${minutes} mins ago`;
	}
	const seconds = diff.diff(ref, 'seconds');
	return `Last Updated ${seconds} sec ago`;
};

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
