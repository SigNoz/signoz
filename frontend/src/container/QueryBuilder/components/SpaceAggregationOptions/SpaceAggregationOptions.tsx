import { SelectSimple } from '@signozhq/ui/select';
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
	const items = operators.map((operator) => ({
		value: operator.value,
		label: `${operator.label}${
			panelType !== PANEL_TYPES.VALUE && qbVersion === 'v2' ? ' By' : ''
		}`,
	}));

	const handleChange = (value: string | string[]): void => {
		onSelect(value as string);
	};

	return (
		<div
			className="spaceAggregationOptionsContainer"
			key={aggregatorAttributeType}
		>
			<SelectSimple
				defaultValue={selectedValue}
				style={{ minWidth: '5.625rem' }}
				disabled={disabled}
				onChange={handleChange}
				items={items}
			/>
		</div>
	);
}

SpaceAggregationOptions.defaultProps = {
	qbVersion: 'v2',
};
