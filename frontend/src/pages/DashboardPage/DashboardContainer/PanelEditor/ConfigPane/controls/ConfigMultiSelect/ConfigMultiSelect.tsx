import { Select } from 'antd';

import styles from './ConfigMultiSelect.module.scss';

export interface ConfigMultiSelectItem<T extends string = string> {
	value: T;
	label: string;
}

interface ConfigMultiSelectProps<T extends string = string> {
	testId: string;
	value: T[];
	placeholder?: string;
	items: ConfigMultiSelectItem<T>[];
	onChange: (value: T[]) => void;
	disabled?: boolean;
	'aria-label'?: string;
}

/** Emits picks in items order, so the stored value is stable. */
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
