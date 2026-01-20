import { Select } from 'antd';
import { ATTRIBUTE_TYPES, PANEL_TYPES } from 'constants/queryBuilder';

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
	return (
		<div
			className="spaceAggregationOptionsContainer"
			key={aggregatorAttributeType}
		>
			<Select
				defaultValue={selectedValue}
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
