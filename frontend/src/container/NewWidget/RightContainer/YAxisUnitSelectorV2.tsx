import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { Dispatch, SetStateAction } from 'react';

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);
function YAxisUnitSelectorV2({
	defaultValue,
	onSelect,
	fieldLabel,
}: {
	defaultValue: string;
	onSelect: OnSelectType;
	fieldLabel: string;
}): JSX.Element {
	return (
		<div className="y-axis-unit-selector-v2">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<YAxisUnitSelectorComponent value={defaultValue} onChange={onSelect} />
		</div>
	);
}

export default YAxisUnitSelectorV2;
