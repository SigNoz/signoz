import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { Dispatch, SetStateAction } from 'react';

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);
function YAxisUnitSelectorV2({
	defaultValue,
	onSelect,
	fieldLabel,
	initialValue,
}: {
	defaultValue: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	initialValue: string;
}): JSX.Element {
	return (
		<div className="y-axis-unit-selector-v2">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<YAxisUnitSelectorComponent
				value={defaultValue}
				onChange={onSelect}
				initialValue={initialValue}
			/>
		</div>
	);
}

export default YAxisUnitSelectorV2;
