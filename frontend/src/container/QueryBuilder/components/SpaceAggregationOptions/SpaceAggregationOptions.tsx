import { Select } from 'antd';
import { ATTRIBUTE_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { useEffect, useState } from 'react';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

interface SpaceAggregationOptionsProps {
	panelType: PANEL_TYPES | null;
	selectedValue: string | undefined;
	aggregatorAttributeType: ATTRIBUTE_TYPES | null;
	disabled: boolean;
	onSelect: (value: string) => void;
	operators: any[];
	qbVersion?: string;
}

export default function SpaceAggregationOptions({
	panelType,
	selectedValue,
	aggregatorAttributeType = ATTRIBUTE_TYPES.GAUGE,
	disabled,
	onSelect,
	operators,
	qbVersion,
}: SpaceAggregationOptionsProps): JSX.Element {
	const placeHolderText =
		panelType === PANEL_TYPES.VALUE || qbVersion === 'v3' ? 'Sum' : 'Sum By';
	const [defaultValue, setDefaultValue] = useState(
		selectedValue || placeHolderText,
	);

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
	}, [aggregatorAttributeType]);

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
			>
				{operators.map((operator) => (
					<Select.Option key={operator.value} value={operator.value}>
						{operator.label}{' '}
						{panelType !== PANEL_TYPES.VALUE && qbVersion === 'v2' ? ' By' : ''}
					</Select.Option>
				))}
			</Select>
		</div>
	);
}

SpaceAggregationOptions.defaultProps = {
	qbVersion: 'v2',
};
