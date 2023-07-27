import { Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ValueGraph from 'components/ValueGraph';
import { memo } from 'react';
import { useLocation } from 'react-router-dom';

import { TitleContainer, ValueContainer } from './styles';
import { GridValueComponentProps } from './types';

function GridValueComponent({
	data,
	title,
	yAxisUnit,
}: GridValueComponentProps): JSX.Element {
	const value = (((data.datasets[0] || []).data || [])[0] || 0) as number;

	const location = useLocation();

	const isDashboardPage = location.pathname.split('/').length === 3;

	if (data.datasets.length === 0) {
		return (
			<ValueContainer isDashboardPage={isDashboardPage}>
				<Typography>No Data</Typography>
			</ValueContainer>
		);
	}

	return (
		<>
			<TitleContainer isDashboardPage={isDashboardPage}>
				<Typography>{title}</Typography>
			</TitleContainer>
			<ValueContainer isDashboardPage={isDashboardPage}>
				<ValueGraph
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
