import { Button, Select } from 'antd';
import { useEffect, useState } from 'react';

const havingOperators = [
	{
		label: '=',
		value: '=',
	},
	{
		label: '!=',
		value: '!=',
	},
	{
		label: '>',
		value: '>',
	},
	{
		label: '<',
		value: '<',
	},
	{
		label: '>=',
		value: '>=',
	},
	{
		label: '<=',
		value: '<=',
	},
	{
		label: 'IN',
		value: 'IN',
	},
	{
		label: 'NOT_IN',
		value: 'NOT_IN',
	},
];

function HavingFilter({
	selectedAggreateOptions,
	onClose,
}: {
	selectedAggreateOptions: { func: string; arg: string }[];
	onClose: () => void;
}): JSX.Element {
	const [selectedHavingOptions, setSelectedHavingOptions] = useState<string[]>(
		[],
	);

	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);

	useEffect(() => {
		const options = [];

		for (let i = 0; i < selectedAggreateOptions.length; i++) {
			const opt = selectedAggreateOptions[i];

			for (let j = 0; j < havingOperators.length; j++) {
				const operator = havingOperators[j];

				options.push({
					label: `${opt.func}(${opt.arg}) ${operator.label}`,
					value: `${opt.func}(${opt.arg}) ${operator.label}`,
				});
			}
		}

		console.log('options', options);

		setOptions(options);
	}, [selectedAggreateOptions]);

	console.log(
		'selectedHavingOptions',
		selectedHavingOptions,
		selectedAggreateOptions,
		setSelectedHavingOptions,
	);

	console.log('options', options);

	return (
		<div className="having-filter-container">
			<Select
				mode="multiple"
				options={options}
				onChange={(value): void => {
					setSelectedHavingOptions(value);
				}}
				style={{ width: '100%' }}
			/>
			<Button className="close-btn periscope-btn ghost" onClick={onClose}>
				Close
			</Button>
		</div>
	);
}

export default HavingFilter;
