import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';
import { Dispatch, SetStateAction, useEffect } from 'react';

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
	const { yAxisUnit: initialYAxisUnit, isLoading } = useGetYAxisUnit();

	useEffect(() => {
		if (initialYAxisUnit && (!defaultValue || defaultValue === 'none')) {
			onSelect(initialYAxisUnit);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialYAxisUnit]);

	return (
		<div className="y-axis-unit-selector-v2">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<YAxisUnitSelectorComponent
				value={defaultValue}
				onChange={onSelect}
				initialValue={initialYAxisUnit}
				source={YAxisSource.DASHBOARDS}
				loading={isLoading}
			/>
		</div>
	);
}

export default YAxisUnitSelectorV2;
