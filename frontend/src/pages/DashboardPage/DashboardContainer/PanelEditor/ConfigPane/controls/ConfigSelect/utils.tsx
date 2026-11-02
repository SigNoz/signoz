import type { ReactNode } from 'react';
import { Tooltip } from 'antd';

import type { ConfigSelectItem } from './ConfigSelect';

import styles from './ConfigSelect.module.scss';

interface SelectOption<T extends string> {
	value: T;
	disabled?: boolean;
	label: ReactNode;
}

export function toOption<T extends string>(
	item: ConfigSelectItem<T>,
): SelectOption<T> {
	const content = item.icon ? (
		<span className={styles.item}>
			{item.icon}
			{item.label}
		</span>
	) : (
		item.label
	);
	return {
		value: item.value,
		disabled: item.disabled,
		label: item.tooltip ? (
			<Tooltip title={item.tooltip} placement="top">
				<span className={styles.tooltipTrigger}>{content}</span>
			</Tooltip>
		) : (
			content
		),
	};
}

/** Nests options under their item's `group`, keeping first-seen order; ungrouped stay flat. */
export function groupOptions<T extends string>(
	options: SelectOption<T>[],
	items: ConfigSelectItem<T>[],
): (SelectOption<T> | { label: string; options: SelectOption<T>[] })[] {
	const grouped: (
		| SelectOption<T>
		| { label: string; options: SelectOption<T>[] }
	)[] = [];
	const byGroup = new Map<string, SelectOption<T>[]>();
	options.forEach((option, index) => {
		const { group } = items[index];
		if (!group) {
			grouped.push(option);
			return;
		}
		let members = byGroup.get(group);
		if (!members) {
			members = [];
			byGroup.set(group, members);
			grouped.push({ label: group, options: members });
		}
		members.push(option);
	});
	return grouped;
}
