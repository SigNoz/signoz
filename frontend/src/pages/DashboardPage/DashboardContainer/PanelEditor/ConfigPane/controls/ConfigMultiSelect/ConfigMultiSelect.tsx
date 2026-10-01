import { Select } from 'antd';

import styles from './ConfigMultiSelect.module.scss';

export interface ConfigMultiSelectItem<T extends string = string> {
	value: T;
	label: string;
}

interface ConfigMultiSelectProps<T extends string = string> {
	testId: string;
	value: T[];
	/** Shown while nothing is selected, which is a valid choice. */
	placeholder?: string;
	items: ConfigMultiSelectItem<T>[];
	onChange: (value: T[]) => void;
	disabled?: boolean;
	'aria-label'?: string;
}

/**
 * Multi-select for the config sections; the picks show as tags. The order of
 * `items` is kept rather than the order they were picked in, so the same set
 * always reads (and is stored) the same way.
 */
function ConfigMultiSelect<T extends string = string>({
	testId,
	value,
	placeholder,
	items,
	onChange,
	disabled,
	'aria-label': ariaLabel,
}: ConfigMultiSelectProps<T>): JSX.Element {
	return (
		<Select<T[]>
			mode="multiple"
			className={styles.select}
			data-testid={testId}
			aria-label={ariaLabel}
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			virtual={false}
			options={items}
			onChange={(next): void =>
				onChange(
					items
						.map((item) => item.value)
						.filter((candidate) => next.includes(candidate)),
				)
			}
		/>
	);
}

export default ConfigMultiSelect;
