import { Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ValueGraph from 'components/ValueGraph';
import { generateGridTitle } from 'container/GridPanelSwitch/utils';
import { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { TitleContainer, ValueContainer } from './styles';
import { GridValueComponentProps } from './types';

function GridValueComponent({
	data,
	title,
	yAxisUnit,
	thresholds,
}: GridValueComponentProps): JSX.Element {
	const value = ((data[1] || [])[0] || 0) as number;

	const location = useLocation();
	const gridTitle = useMemo(() => generateGridTitle(title), [title]);

	const isDashboardPage = location.pathname.split('/').length === 3;

	if (data.length === 0) {
		return (
			<ValueContainer>
				<Typography>No Data</Typography>
			</ValueContainer>
		);
	}

	return (
		<>
			<TitleContainer isDashboardPage={isDashboardPage}>
				<Typography>{gridTitle}</Typography>
			</TitleContainer>
			<ValueContainer>
				<ValueGraph
					thresholds={thresholds || []}
					rawValue={value}
					value={
						yAxisUnit
							? getYAxisFormattedValue(String(value), yAxisUnit)
							: value.toString()
					}
				/>
			</ValueContainer>
		</>
	);
}

export default memo(GridValueComponent);
