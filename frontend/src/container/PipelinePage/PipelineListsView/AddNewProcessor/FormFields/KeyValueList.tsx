import { ClipboardEvent } from 'react';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { Form } from 'antd';

import { PREDEFINED_MAPPING } from '../config';

interface KeyValueListProps {
	value?: Record<string, string[]>;
	onChange?: (value: Record<string, string[]>) => void;
}

function KeyValueList({
	value = PREDEFINED_MAPPING,
	onChange,
}: KeyValueListProps): JSX.Element {
	const handleValueChange = (key: string, newValue: string[]): void => {
		const newMapping = {
			...value,
			[key]: newValue,
		};
		if (onChange) {
			onChange(newMapping);
		}
	};

	// Replicates antd `tokenSeparators={[',']}` for pasted text.
	const handlePaste =
		(key: string) =>
		(event: ClipboardEvent<HTMLDivElement>): void => {
			const pasted = event.clipboardData?.getData('text');
			if (!pasted || !pasted.includes(',')) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const tokens = pasted
				.split(',')
				.map((token) => token.trim())
				.filter(Boolean);
			if (tokens.length === 0) {
				return;
			}
			const existing = value[key] ?? [];
			const merged = Array.from(new Set([...existing, ...tokens]));
			handleValueChange(key, merged);
		};

	return (
		<div>
			{Object.keys(value).map((key) => (
				<Form.Item key={key} label={key}>
					<div onPaste={handlePaste(key)} style={{ width: '100%' }}>
						<ComboboxSimple
							multiple
							allowCreate
							items={[]}
							style={{ width: '100%' }}
							placeholder="Values"
							value={value[key]}
							onChange={(newValue): void =>
								handleValueChange(key, newValue as string[])
							}
						/>
					</div>
				</Form.Item>
			))}
		</div>
	);
}

KeyValueList.defaultProps = {
	value: PREDEFINED_MAPPING,
	onChange: (): void => {},
};

export default KeyValueList;
