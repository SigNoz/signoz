import { useEffect, useState } from 'react';

import type { SelectedTag } from '../types';

const tagId = (tag: SelectedTag): string => `${tag.key}:${tag.value}`;

// The list response only reports the tags present in the current (filtered) page,
// so tags vanish from the filter options as results narrow. Accumulate every tag
// we've ever seen so previously-surfaced tags stay selectable across refetches.
export function useAccumulatedTags(responseTags: SelectedTag[]): SelectedTag[] {
	const [tags, setTags] = useState<SelectedTag[]>([]);

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
