import { Form, Select } from 'antd';

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

	return (
		<div>
			{Object.keys(value).map((key) => (
				<Form.Item key={key} label={key}>
					<Select
						mode="tags"
						style={{ width: '100%' }}
						placeholder="Values"
						onChange={(newValue: string[]): void => handleValueChange(key, newValue)}
						value={value[key]}
						tokenSeparators={[',']}
					/>
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
