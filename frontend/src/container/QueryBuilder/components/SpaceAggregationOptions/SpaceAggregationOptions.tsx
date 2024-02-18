import { Select } from 'antd';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

interface SpaceAggregationOptionsProps {
	aggregatorAttributeType: ATTRIBUTE_TYPES | null;
	disabled: boolean;
	onSelect: (value: string) => void;
	operators: any[];
}

export default function SpaceAggregationOptions({
	aggregatorAttributeType = ATTRIBUTE_TYPES.GAUGE,
	disabled,
	onSelect,
	operators,
}: SpaceAggregationOptionsProps): JSX.Element {
	let defaultValue = 'Sum By';

	if (
		aggregatorAttributeType &&
		aggregatorAttributeType === ATTRIBUTE_TYPES.HISTOGRAM
	) {
		defaultValue = MetricAggregateOperator.P90;
	} else if (
		aggregatorAttributeType &&
		aggregatorAttributeType === ATTRIBUTE_TYPES.SUM
	) {
		defaultValue = MetricAggregateOperator.SUM;
	} else if (
		aggregatorAttributeType &&
		aggregatorAttributeType === ATTRIBUTE_TYPES.GAUGE
	) {
		defaultValue = MetricAggregateOperator.AVG;
	}

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
