import type { ReactNode } from 'react';
import { Select, Tooltip } from 'antd';

import styles from './ConfigSelect.module.scss';

export interface ConfigSelectItem<T extends string = string> {
	value: T;
	label: string;
	/** Optional leading icon node rendered before the label. */
	icon?: ReactNode;
	disabled?: boolean;
	/** Hover hint shown on the option — typically the reason a disabled item is disabled. */
	tooltip?: string;
	/** Heading the option is listed under; items sharing one are grouped in order. */
	group?: string;
}

interface SelectOption<T extends string> {
	value: T;
	disabled?: boolean;
	label: ReactNode;
}

interface ConfigSelectProps<T extends string = string> {
	testId: string;
	value: T | undefined;
	placeholder?: string;
	items: ConfigSelectItem<T>[];
	onChange: (value: T) => void;
	/** Filters the items by label as the user types; for long lists. */
	showSearch?: boolean;
}

function toOption<T extends string>(
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
function groupOptions<T extends string>(
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

/**
 * Single-select dropdown for the panel editor's config sections. Built on antd's
 * `Select` so it matches the rest of the editor's antd controls; the menu portals to
 * `document.body` (antd default) so the surrounding `overflow:auto` pane can't clip it.
 */
function ConfigSelect<T extends string = string>({
	testId,
	value,
	placeholder,
	items,
	onChange,
	showSearch,
}: ConfigSelectProps<T>): JSX.Element {
	return (
		<Select<T>
			className={styles.select}
			data-testid={testId}
			value={value}
			placeholder={placeholder}
			onChange={onChange}
			virtual={false}
			showSearch={showSearch}
			filterOption={(input, option): boolean =>
				!!items
					.find((item) => item.value === option?.value)
					?.label.toLowerCase()
					.includes(input.toLowerCase())
			}
			options={groupOptions(items.map(toOption), items)}
		/>
	);
}

export default ConfigSelect;
