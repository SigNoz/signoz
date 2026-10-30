import { ComboboxSimple } from '@signozhq/ui/combobox';

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
}

/** Emits picks in items order, so the stored value is stable. */
function ConfigMultiSelect<T extends string = string>({
	testId,
	value,
	placeholder,
	items,
	onChange,
	disabled,
}: ConfigMultiSelectProps<T>): JSX.Element {
	return (
		<ComboboxSimple
			multiple
			className={styles.select}
			testId={testId}
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			items={items}
			onChange={(next): void => {
				const picked = Array.isArray(next) ? next : [];
				onChange(
					items
						.map((item) => item.value)
						.filter((candidate) => picked.includes(candidate)),
				);
			}}
		/>
	);
}

export default ConfigMultiSelect;
