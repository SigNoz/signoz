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
}

interface ConfigSelectProps<T extends string = string> {
	testId: string;
	value: T | undefined;
	placeholder?: string;
	items: ConfigSelectItem<T>[];
	onChange: (value: T) => void;
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
}: ConfigSelectProps<T>): JSX.Element {
	return (
		<Select<T>
			className={styles.select}
			data-testid={testId}
			value={value}
			placeholder={placeholder}
			onChange={onChange}
			virtual={false}
			options={items.map((item) => {
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
			})}
		/>
	);
}

export default ConfigSelect;
