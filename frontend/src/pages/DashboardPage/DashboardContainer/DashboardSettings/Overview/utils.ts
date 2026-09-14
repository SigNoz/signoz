import type { TagtypesPostableTagDTO } from 'api/generated/services/sigNoz.schemas';
import { RelativeDurationOptions } from 'container/TopNav/DateTimeSelectionV2/constants';

export { parseKeyValueTag } from 'components/TagKeyValueInput/utils';

// The tag editor is strictly key:value, so always render both sides — a
// `key:key` tag stays `key:key` rather than collapsing to a bare `key`.
export function tagsToStrings(tags: TagtypesPostableTagDTO[]): string[] {
	return tags.map((t) => `${t.key}:${t.value}`);
}

export function stringsToTags(tagStrings: string[]): TagtypesPostableTagDTO[] {
	return tagStrings
		.map((s) => {
			const trimmed = s.trim();
			const idx = trimmed.indexOf(':');
			if (idx === -1) {
				return { key: trimmed, value: trimmed };
			}
			const key = trimmed.slice(0, idx).trim();
			const value = trimmed.slice(idx + 1).trim();
			return { key, value: value || key };
		})
		.filter((t) => t.key.length > 0);
}

// Radix rejects an empty option value, so "not set" travels through the select
// under a sentinel and is mapped back to '' on the way out.
export const DEFAULT_TIME_RANGE_UNSET = '__unset__';

// `1month` is excluded: the backend validates the window as a Perses duration,
// which has no month unit.
const SELECTABLE_DURATIONS = RelativeDurationOptions.filter(
	(option) => option.value !== '1month',
);

// A window set through the API may sit outside the list; it's appended so the
// select shows it instead of rendering blank.
export function buildDefaultTimeRangeItems(
	value: string,
): { value: string; label: string }[] {
	const items = [
		{ value: DEFAULT_TIME_RANGE_UNSET, label: 'Default (Last 30 minutes)' },
		...SELECTABLE_DURATIONS.map((option) => ({
			value: option.value,
			label: option.label,
		})),
	];
	if (value && !items.some((item) => item.value === value)) {
		items.push({ value, label: `Last ${value}` });
	}
	return items;
}
