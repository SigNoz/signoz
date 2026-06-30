import type { ReactNode } from 'react';
import { Select } from 'antd';

import styles from './ConfigSelect.module.scss';

export interface ConfigSelectItem<T extends string = string> {
	value: T;
	label: string;
	/** Optional leading icon node rendered before the label. */
	icon?: ReactNode;
	disabled?: boolean;
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
			options={items.map((item) => ({
				value: item.value,
				disabled: item.disabled,
				label: item.icon ? (
					<span className={styles.item}>
						{item.icon}
						{item.label}
					</span>
				) : (
					item.label
				),
			}))}
		/>
	);
}

export default ConfigSelect;
