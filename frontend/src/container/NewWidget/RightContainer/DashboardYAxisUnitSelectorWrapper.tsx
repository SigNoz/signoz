import { Typography } from 'antd';
import YAxisUnitSelectorComponent from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';
import { Dispatch, SetStateAction, useEffect } from 'react';

type OnSelectType = Dispatch<SetStateAction<string>> | ((val: string) => void);

/**
 * Wrapper component for the y-axis unit selector for dashboards.
 */
function DashboardYAxisUnitSelectorWrapper({
	value,
	onSelect,
	fieldLabel,
	showWarning,
	selectedQueryName,
	onClear,
}: {
	value: string;
	onSelect: OnSelectType;
	fieldLabel: string;
	showWarning: boolean;
	selectedQueryName?: string;
	onClear?: () => void;
}): JSX.Element {
	const { yAxisUnit: initialYAxisUnit, isLoading } = useGetYAxisUnit(
		selectedQueryName,
		{
			enabled: showWarning,
		},
	);

	useEffect(() => {
		if (showWarning) {
			onSelect(initialYAxisUnit || '');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialYAxisUnit, showWarning]);

	return (
		<div className="y-axis-unit-selector-v2">
			<Typography.Text className="heading">{fieldLabel}</Typography.Text>
			<YAxisUnitSelectorComponent
				value={value}
				onChange={onSelect}
				initialValue={initialYAxisUnit}
				source={YAxisSource.DASHBOARDS}
				loading={isLoading}
				onClear={onClear}
			/>
		</div>
	);
}

DashboardYAxisUnitSelectorWrapper.defaultProps = {
	selectedQueryName: undefined,
	onClear: undefined,
};

export default DashboardYAxisUnitSelectorWrapper;
