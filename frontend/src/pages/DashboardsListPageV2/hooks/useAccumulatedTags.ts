import { useEffect, useState } from 'react';

// A key:value tag pair the list API reports across the org's dashboards.
export interface TagPair {
	key: string;
	value: string;
}

const tagId = (tag: TagPair): string => `${tag.key}:${tag.value}`;

// The list response only reports the tags present in the current (filtered) page,
// so tags vanish from the suggestions as results narrow. Accumulate every tag
// we've ever seen so previously-surfaced tags stay suggestable across refetches.
export function useAccumulatedTags(responseTags: TagPair[]): TagPair[] {
	const [tags, setTags] = useState<TagPair[]>([]);

	useEffect(() => {
		if (responseTags.length === 0) {
			return;
		}
		setTags((prev) => {
			const merged = new Map(prev.map((t) => [tagId(t), t]));
			let changed = false;
			responseTags.forEach((t) => {
				const id = tagId(t);
				if (!merged.has(id)) {
					merged.set(id, t);
					changed = true;
				}
			});
			return changed ? Array.from(merged.values()) : prev;
		});
	}, [responseTags]);

	return tags;
}
