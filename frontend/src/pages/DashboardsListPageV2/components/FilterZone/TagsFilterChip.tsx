import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';
import { ChevronDown, Tag } from '@signozhq/icons';
import cx from 'classnames';

import type { SelectedTag } from '../../types';

import styles from './FilterZone.module.scss';

interface Props {
	// All key:value tags the list API reports across the org's dashboards.
	availableTags: SelectedTag[];
	tags: SelectedTag[];
	onTagsChange: (tags: SelectedTag[]) => void;
}

const tagId = (tag: SelectedTag): string => `${tag.key}:${tag.value}`;

function TagsFilterChip({
	availableTags,
	tags,
	onTagsChange,
}: Props): JSX.Element {
	const selectedIds = useMemo(() => new Set(tags.map(tagId)), [tags]);

	const label = useMemo((): string => {
		if (tags.length === 0) {
			return 'Any';
		}
		if (tags.length === 1) {
			return tagId(tags[0]);
		}
		return `${tags.length} tags`;
	}, [tags]);

	const items = useMemo<MenuItem[]>(() => {
		const options: MenuItem[] = availableTags.map((tag) => {
			const id = tagId(tag);
			return {
				type: 'checkbox',
				key: id,
				label: id,
				checked: selectedIds.has(id),
				onCheckedChange: (checked: boolean): void =>
					onTagsChange(
						checked ? [...tags, tag] : tags.filter((t) => tagId(t) !== id),
					),
			};
		});
		if (tags.length > 0) {
			options.push({ type: 'divider', key: 'sep' });
			options.push({
				key: 'clear',
				label: 'Clear selection',
				onClick: (): void => onTagsChange([]),
			});
		}
		return options;
	}, [availableTags, selectedIds, tags, onTagsChange]);

	return (
		<DropdownMenuSimple menu={{ items }} align="start">
			<Button
				variant="outlined"
				color="secondary"
				size="sm"
				prefix={<Tag size={12} />}
				suffix={<ChevronDown size={12} />}
				className={cx(styles.chip, { [styles.chipActive]: tags.length > 0 })}
				disabled={availableTags.length === 0}
				testId="dashboards-filter-tags"
			>
				Tags: {label}
			</Button>
		</DropdownMenuSimple>
	);
}

export default TagsFilterChip;
