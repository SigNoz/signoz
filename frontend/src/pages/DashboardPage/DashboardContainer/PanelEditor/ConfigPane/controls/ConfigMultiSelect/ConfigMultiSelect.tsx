import { Combobox } from '@signozhq/ui/combobox';

export interface ConfigMultiSelectItem<T extends string = string> {
	value: T;
	label: string;
}

interface ConfigMultiSelectProps<T extends string = string> {
	testId: string;
	value: T[];
	placeholder: string;
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
		<Combobox
			multiple
			width="100%"
			testId={testId}
			value={value}
			placeholder={placeholder}
			searchInputProps={{ placeholder: 'Search' }}
			disabled={disabled}
			disabledTooltip={undefined}
			items={items.map((item) => ({ type: 'item', ...item }))}
			onChange={(picked): void => {
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
