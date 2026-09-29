import type { ChangeEvent } from 'react';
import { Input } from 'antd';

import ConfigField from '../ConfigField/ConfigField';

interface ConfigNumberInputProps {
	testId: string;
	label: string;
	value: number | null | undefined;
	onChange: (next: number | null) => void;
}

/** Numeric input where empty means "auto"; transient non-numeric input (e.g. "-") clears. */
function ConfigNumberInput({
	testId,
	label,
	value,
	onChange,
}: ConfigNumberInputProps): JSX.Element {
	const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
		const raw = e.target.value;
		onChange(raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw));
	};

	return (
		<ConfigField label={label} plain>
			<Input
				data-testid={testId}
				type="number"
				placeholder="Auto"
				value={value ?? ''}
				onChange={handleChange}
			/>
		</ConfigField>
	);
}

export default ConfigNumberInput;
