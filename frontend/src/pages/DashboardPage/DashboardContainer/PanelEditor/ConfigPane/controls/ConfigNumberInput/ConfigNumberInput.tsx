import type { ChangeEvent } from 'react';
import { Input } from 'antd';

import ConfigField from '../ConfigField/ConfigField';

interface ConfigNumberInputProps {
	testId: string;
	/** Omitted for an input whose row already names it. */
	label?: string;
	placeholder?: string;
	value: number | null | undefined;
	onChange: (next: number | null) => void;
}

/** Numeric input where empty means "auto"; transient non-numeric input (e.g. "-") clears. */
function ConfigNumberInput({
	testId,
	label,
	placeholder = 'Auto',
	value,
	onChange,
}: ConfigNumberInputProps): JSX.Element {
	const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
		const raw = e.target.value;
		onChange(raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw));
	};

	const input = (
		<Input
			data-testid={testId}
			type="number"
			placeholder={placeholder}
			value={value ?? ''}
			onChange={handleChange}
		/>
	);

	return label ? (
		<ConfigField label={label} plain>
			{input}
		</ConfigField>
	) : (
		input
	);
}

export default ConfigNumberInput;
