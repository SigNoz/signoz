import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';
import { Dispatch, SetStateAction, useEffect } from 'react';

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);
function YAxisUnitSelectorV2({
	value,
	onSelect,
	fieldLabel,
	showWarning,
	selectedQueryName,
}: {
	value: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	showWarning: boolean;
	selectedQueryName?: string;
}): JSX.Element {
	const { yAxisUnit: initialYAxisUnit, isLoading } = useGetYAxisUnit(
		selectedQueryName,
		{
			enabled: showWarning,
		},
	);

	useEffect(() => {
		if (initialYAxisUnit && showWarning) {
			onSelect(initialYAxisUnit);
		}
	}, [initialYAxisUnit, showWarning, onSelect]);

	return (
		<div className="y-axis-unit-selector-v2">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<YAxisUnitSelectorComponent
				value={value}
				onChange={onSelect}
				initialValue={initialYAxisUnit}
				source={YAxisSource.DASHBOARDS}
				loading={isLoading}
			/>
		</div>
	);
}

YAxisUnitSelectorV2.defaultProps = {
	selectedQueryName: undefined,
};

export default YAxisUnitSelectorV2;
