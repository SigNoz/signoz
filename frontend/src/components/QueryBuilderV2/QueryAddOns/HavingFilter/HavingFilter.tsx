import { Button, Select } from 'antd';
import { useQueryBuilderV2Context } from 'components/QueryBuilderV2/QueryBuilderV2Context';
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

function HavingFilter({ onClose }: { onClose: () => void }): JSX.Element {
	const { aggregationOptions } = useQueryBuilderV2Context();

	const [selectedHavingOptions, setSelectedHavingOptions] = useState<string[]>(
		[],
	);

	console.log('selectedHavingOptions', selectedHavingOptions);

	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);

	useEffect(() => {
		const options = [];

		for (let i = 0; i < aggregationOptions.length; i++) {
			const opt = aggregationOptions[i];

			for (let j = 0; j < havingOperators.length; j++) {
				const operator = havingOperators[j];

				options.push({
					label: `${opt.func}(${opt.arg}) ${operator.label}`,
					value: `${opt.func}(${opt.arg}) ${operator.label}`,
				});
			}
		}

		setOptions(options);
	}, [aggregationOptions]);

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
