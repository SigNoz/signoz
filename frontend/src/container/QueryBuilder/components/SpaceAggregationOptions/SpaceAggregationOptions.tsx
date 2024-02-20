import { Select } from 'antd';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import { useEffect, useState } from 'react';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

interface SpaceAggregationOptionsProps {
	selectedValue: string | undefined;
	aggregatorAttributeType: ATTRIBUTE_TYPES | null;
	disabled: boolean;
	onSelect: (value: string) => void;
	operators: any[];
}

export default function SpaceAggregationOptions({
	selectedValue,
	aggregatorAttributeType = ATTRIBUTE_TYPES.GAUGE,
	disabled,
	onSelect,
	operators,
}: SpaceAggregationOptionsProps): JSX.Element {
	const [defaultValue, setDefaultValue] = useState(selectedValue || 'Sum By');

	useEffect(() => {
		if (!selectedValue) {
			if (
				aggregatorAttributeType === ATTRIBUTE_TYPES.HISTOGRAM ||
				aggregatorAttributeType === ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM
			) {
				setDefaultValue(MetricAggregateOperator.P90);
				onSelect(MetricAggregateOperator.P90);
			} else if (aggregatorAttributeType === ATTRIBUTE_TYPES.SUM) {
				setDefaultValue(MetricAggregateOperator.SUM);
				onSelect(MetricAggregateOperator.SUM);
			} else if (aggregatorAttributeType === ATTRIBUTE_TYPES.GAUGE) {
				setDefaultValue(MetricAggregateOperator.AVG);
				onSelect(MetricAggregateOperator.AVG);
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			className="spaceAggregationOptionsContainer"
			key={aggregatorAttributeType}
		>
			<Select
				defaultValue={defaultValue}
				style={{ minWidth: '5.625rem' }}
				disabled={disabled}
				onChange={onSelect}
				options={operators}
			/>
		</div>
	);
}
