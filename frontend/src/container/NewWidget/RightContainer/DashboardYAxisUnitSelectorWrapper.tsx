import { Dispatch, SetStateAction, useEffect } from 'react';
import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);

/**
 * Wrapper component for the y-axis unit selector for dashboards.
 */
function DashboardYAxisUnitSelectorWrapper({
	value,
	onSelect,
	fieldLabel,
	shouldUpdateYAxisUnit,
	selectedQueryName,
}: {
	value: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	shouldUpdateYAxisUnit: boolean;
	selectedQueryName?: string;
}): JSX.Element {
	const { yAxisUnit: initialYAxisUnit, isLoading } = useGetYAxisUnit(
		selectedQueryName,
	);

	useEffect(() => {
		if (shouldUpdateYAxisUnit) {
			onSelect(initialYAxisUnit || '');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialYAxisUnit, shouldUpdateYAxisUnit]);

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

DashboardYAxisUnitSelectorWrapper.defaultProps = {
	selectedQueryName: undefined,
};

export default DashboardYAxisUnitSelectorWrapper;
