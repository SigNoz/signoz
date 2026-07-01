import type { TagtypesPostableTagDTO } from 'api/generated/services/sigNoz.schemas';

export { Base64Icons } from 'container/DashboardContainer/DashboardSettings/General/utils';
export { parseKeyValueTag } from 'components/TagKeyValueInput/utils';

// tag UX, a string with no ':' is round-tripped as `{key: x, value: x}` and
// collapsed back to just `x` for display.
export function tagsToStrings(tags: TagtypesPostableTagDTO[]): string[] {
	return tags.map((t) => (t.key === t.value ? t.key : `${t.key}:${t.value}`));
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
